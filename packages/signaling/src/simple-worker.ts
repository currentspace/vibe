/**
 * Simple Cloudflare Worker for WebRTC signaling
 * Without Durable Objects - uses KV for state
 */

export interface Env {
  ROOMS: KVNamespace
}

// Store active connections in memory (lost on worker restart)
const connections = new Map<string, Set<WebSocket>>()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // WebSocket endpoint
    if (url.pathname.startsWith("/ws/")) {
      const roomId = url.pathname.split("/")[2]
      
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 400 })
      }

      const { 0: client, 1: server } = new WebSocketPair()
      
      // Handle the WebSocket
      handleWebSocket(server, roomId, env)
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    // REST endpoints
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const roomId = crypto.randomUUID()
      await env.ROOMS.put(roomId, JSON.stringify({
        created: Date.now(),
        participants: []
      }), { expirationTtl: 86400 }) // 24 hour TTL
      
      return Response.json({ roomId })
    }

    return new Response("Not Found", { status: 404 })
  }
}

function handleWebSocket(ws: WebSocket, roomId: string, env: Env) {
  ws.accept()
  
  // Add to room connections
  if (!connections.has(roomId)) {
    connections.set(roomId, new Set())
  }
  connections.get(roomId)!.add(ws)
  
  const userId = crypto.randomUUID()
  
  ws.addEventListener("message", async (event) => {
    try {
      const data = JSON.parse(event.data as string)
      const room = connections.get(roomId)
      
      if (!room) return
      
      switch (data.type) {
        case "join":
          // Notify others in room
          broadcast(room, {
            type: "user-joined",
            userId
          }, ws)
          
          // Send current participants
          ws.send(JSON.stringify({
            type: "room-joined",
            userId,
            participants: Array.from(room).filter(s => s !== ws).map(() => ({ userId: crypto.randomUUID() }))
          }))
          break
          
        case "offer":
        case "answer":
        case "ice-candidate":
          // Relay to all others
          broadcast(room, {
            type: data.type,
            userId,
            data: data.data
          }, ws)
          break
      }
    } catch (e) {
      console.error("Error handling message:", e)
    }
  })
  
  ws.addEventListener("close", () => {
    const room = connections.get(roomId)
    if (room) {
      room.delete(ws)
      broadcast(room, {
        type: "user-left",
        userId
      })
      
      // Clean up empty rooms
      if (room.size === 0) {
        connections.delete(roomId)
      }
    }
  })
}

function broadcast(room: Set<WebSocket>, message: any, exclude?: WebSocket) {
  const msg = JSON.stringify(message)
  room.forEach(ws => {
    if (ws !== exclude && ws.readyState === WebSocket.READY_STATE_OPEN) {
      ws.send(msg)
    }
  })
}