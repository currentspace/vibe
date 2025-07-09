/**
 * Hybrid Cloudflare Worker - Works with or without Durable Objects
 * Gracefully degrades to in-memory storage if DO not available
 */

export interface Env {
  SIGNALING_ROOMS?: DurableObjectNamespace // Optional
  USE_DURABLE_OBJECTS?: string // Environment flag
}

// Fallback in-memory storage
const memoryRooms = new Map<string, Set<WebSocket>>()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const useDO = env.USE_DURABLE_OBJECTS === 'true' && env.SIGNALING_ROOMS
    
    // WebSocket handling
    if (url.pathname.startsWith("/ws/")) {
      const roomId = url.pathname.split("/")[2]
      
      if (!roomId) {
        return new Response("Room ID required", { status: 400 })
      }

      // Use Durable Objects if available
      if (useDO) {
        const id = env.SIGNALING_ROOMS!.idFromName(roomId)
        const room = env.SIGNALING_ROOMS!.get(id)
        return room.fetch(request)
      }
      
      // Otherwise use in-memory
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 400 })
      }

      const { 0: client, 1: server } = new WebSocketPair()
      handleMemoryWebSocket(server, roomId)
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    // Room creation
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const roomId = crypto.randomUUID()
      return Response.json({
        roomId,
        type: useDO ? 'durable' : 'memory',
        warning: useDO ? undefined : 'Room state will be lost on worker restart'
      })
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "healthy",
        mode: useDO ? 'durable-objects' : 'in-memory',
        rooms: useDO ? 'persistent' : memoryRooms.size
      })
    }

    return new Response("Not Found", { status: 404 })
  }
}

function handleMemoryWebSocket(ws: WebSocket, roomId: string) {
  ws.accept()
  
  // Initialize room if needed
  if (!memoryRooms.has(roomId)) {
    memoryRooms.set(roomId, new Set())
  }
  
  const room = memoryRooms.get(roomId)!
  room.add(ws)
  
  const userId = crypto.randomUUID()
  
  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data as string)
      
      switch (data.type) {
        case "join":
          // Send current participants
          const participants = Array.from(room)
            .filter(s => s !== ws)
            .map(() => ({ userId: crypto.randomUUID() }))
          
          ws.send(JSON.stringify({
            type: "room-joined",
            userId,
            participants
          }))
          
          // Notify others
          broadcast(room, {
            type: "user-joined",
            userId
          }, ws)
          break
          
        case "offer":
        case "answer":
        case "ice-candidate":
          broadcast(room, {
            type: data.type,
            userId,
            targetUserId: data.targetUserId,
            data: data.data
          }, ws)
          break
      }
    } catch (e) {
      console.error("Message error:", e)
    }
  })
  
  ws.addEventListener("close", () => {
    room.delete(ws)
    broadcast(room, {
      type: "user-left",
      userId
    })
    
    // Cleanup empty rooms
    if (room.size === 0) {
      memoryRooms.delete(roomId)
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

// Export the Durable Object class if using DO
export { SignalingRoom } from './cloudflare-worker'