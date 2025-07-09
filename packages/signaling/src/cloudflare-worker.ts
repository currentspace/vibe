/**
 * Cloudflare Workers WebRTC Signaling Server
 * Uses Durable Objects for room state management
 */

export interface Env {
  SIGNALING_ROOMS: DurableObjectNamespace
  TURN_SECRET: string
}

// Room state managed by Durable Object
export class SignalingRoom {
  state: DurableObjectState
  env: Env
  sessions: Map<WebSocket, { id: string; userId?: string }>

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.sessions = new Map()
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 })
    }

    const { 0: client, 1: server } = new WebSocketPair()
    
    await this.handleSession(server)
    
    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async handleSession(webSocket: WebSocket) {
    webSocket.accept()
    
    const sessionId = crypto.randomUUID()
    this.sessions.set(webSocket, { id: sessionId })

    webSocket.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data as string)
        await this.handleMessage(webSocket, data)
      } catch (e) {
        console.error("Error handling message:", e)
      }
    })

    webSocket.addEventListener("close", () => {
      const session = this.sessions.get(webSocket)
      if (session?.userId) {
        this.broadcast({
          type: "user-left",
          userId: session.userId
        }, webSocket)
      }
      this.sessions.delete(webSocket)
    })
  }

  async handleMessage(sender: WebSocket, data: any) {
    const session = this.sessions.get(sender)
    if (!session) return

    switch (data.type) {
      case "join":
        session.userId = data.userId || crypto.randomUUID()
        
        // Send current participants to new user
        const participants = Array.from(this.sessions.values())
          .filter(s => s.userId && s.userId !== session.userId)
          .map(s => ({ userId: s.userId }))
        
        sender.send(JSON.stringify({
          type: "room-joined",
          userId: session.userId,
          participants
        }))
        
        // Notify others
        this.broadcast({
          type: "user-joined",
          userId: session.userId
        }, sender)
        break

      case "offer":
      case "answer":
      case "ice-candidate":
        // Relay to specific peer
        this.sendToPeer(data.targetUserId, {
          type: data.type,
          userId: session.userId,
          data: data.data
        })
        break
    }
  }

  broadcast(message: any, exclude?: WebSocket) {
    const msg = JSON.stringify(message)
    this.sessions.forEach((session, ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(msg)
      }
    })
  }

  sendToPeer(targetUserId: string, message: any) {
    const targetWs = Array.from(this.sessions.entries())
      .find(([ws, session]) => session.userId === targetUserId)?.[0]
    
    if (targetWs && targetWs.readyState === WebSocket.READY_STATE_OPEN) {
      targetWs.send(JSON.stringify(message))
    }
  }
}

// Main worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // Handle WebSocket upgrade for /ws/:roomId
    if (url.pathname.startsWith("/ws/")) {
      const roomId = url.pathname.split("/")[2]
      if (!roomId) {
        return new Response("Room ID required", { status: 400 })
      }

      // Get or create room
      const id = env.SIGNALING_ROOMS.idFromName(roomId)
      const room = env.SIGNALING_ROOMS.get(id)
      
      return room.fetch(request)
    }

    // Handle REST API
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const roomId = crypto.randomUUID()
      return Response.json({
        roomId,
        createdAt: new Date().toISOString()
      })
    }

    if (url.pathname.startsWith("/api/rooms/") && request.method === "GET") {
      const roomId = url.pathname.split("/")[3]
      return Response.json({
        roomId,
        exists: true,
        createdAt: new Date().toISOString()
      })
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "healthy",
        timestamp: new Date().toISOString()
      })
    }

    // TURN credentials endpoint
    if (url.pathname === "/api/turn-credentials" && request.method === "GET") {
      return handleTurnCredentials(request, env)
    }

    return new Response("Not Found", { status: 404 })
  }
}

/**
 * Generate TURN credentials using Cloudflare's TURN service
 */
async function handleTurnCredentials(request: Request, env: Env): Promise<Response> {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  // Generate time-limited credentials
  const ttl = 86400 // 24 hours
  const username = `${Math.floor(Date.now() / 1000) + ttl}:webrtcuser`
  
  // Create HMAC-SHA1 signature
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.TURN_SECRET || 'your-secret-key'),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(username)
  )
  
  const credential = btoa(String.fromCharCode(...new Uint8Array(signature)))

  return Response.json({
    iceServers: [
      {
        urls: 'stun:stun.cloudflare.com:3478'
      },
      {
        urls: 'turn:stun.cloudflare.com:3478',
        username,
        credential
      },
      {
        urls: 'turn:turn.cloudflare.com:3478?transport=tcp',
        username,
        credential
      },
      {
        urls: 'turns:turn.cloudflare.com:5349?transport=tcp',
        username,
        credential
      }
    ],
    ttl
  }, { headers })
}