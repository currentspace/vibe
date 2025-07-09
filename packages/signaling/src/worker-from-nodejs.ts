/**
 * Cloudflare Worker adapted from Node.js signaling server
 * Preserves the same message protocol and room logic
 */

export interface Env {
  SIGNALING_ROOMS?: DurableObjectNamespace
}

// Room data structure matching Node.js version
interface Room {
  id: string
  createdAt: Date
  participants: Map<string, WebSocket>
}

// In-memory rooms (for simple worker version)
const rooms = new Map<string, Room>()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // CORS headers matching your Node.js setup
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // WebSocket upgrade - replaces Socket.io
    if (url.pathname.startsWith('/ws')) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 400 })
      }

      const { 0: client, 1: server } = new WebSocketPair()
      handleSocketConnection(server)
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    // REST API endpoints - same as your Express routes
    try {
      // POST /api/rooms - Create room
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        const roomId = crypto.randomUUID()
        const room: Room = {
          id: roomId,
          createdAt: new Date(),
          participants: new Map()
        }
        rooms.set(roomId, room)
        
        return Response.json({
          roomId,
          createdAt: room.createdAt.toISOString()
        }, { headers: corsHeaders })
      }

      // GET /api/rooms/:roomId - Get room info
      if (url.pathname.match(/^\/api\/rooms\/[\w-]+$/) && request.method === 'GET') {
        const roomId = url.pathname.split('/').pop()!
        const room = rooms.get(roomId)
        
        if (!room) {
          return Response.json({ 
            error: 'Room not found' 
          }, { 
            status: 404,
            headers: corsHeaders 
          })
        }
        
        return Response.json({
          roomId: room.id,
          createdAt: room.createdAt.toISOString(),
          participantCount: room.participants.size
        }, { headers: corsHeaders })
      }

      // GET /health - Health check
      if (url.pathname === '/health') {
        return Response.json({
          status: 'healthy',
          roomCount: rooms.size,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }, { headers: corsHeaders })
      }

      // GET /api-docs - Swagger UI (simplified)
      if (url.pathname === '/api-docs') {
        return new Response(`
          <html>
            <head><title>Signaling API</title></head>
            <body>
              <h1>WebRTC Signaling API</h1>
              <h2>Endpoints:</h2>
              <ul>
                <li>POST /api/rooms - Create room</li>
                <li>GET /api/rooms/:id - Get room info</li>
                <li>WS /ws - WebSocket connection</li>
              </ul>
            </body>
          </html>
        `, {
          headers: {
            'Content-Type': 'text/html',
            ...corsHeaders
          }
        })
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders })
      
    } catch (error) {
      console.error('Request error:', error)
      return Response.json({ 
        error: 'Internal server error' 
      }, { 
        status: 500,
        headers: corsHeaders 
      })
    }
  }
}

// Socket connection handler - replaces Socket.io logic
function handleSocketConnection(ws: WebSocket) {
  ws.accept()
  
  let currentRoom: string | null = null
  let userId: string | null = null
  
  console.log('New WebSocket connection')
  
  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data as string)
      
      switch (data.type || data.event) {
        // Handle both Socket.io style and plain messages
        case 'join-room':
        case 'join':
          const roomId = data.roomId || data.data?.roomId
          userId = data.userId || data.data?.userId || crypto.randomUUID()
          
          const room = rooms.get(roomId)
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found'
            }))
            return
          }
          
          // Leave previous room if any
          if (currentRoom && currentRoom !== roomId) {
            const oldRoom = rooms.get(currentRoom)
            if (oldRoom) {
              oldRoom.participants.delete(userId)
              broadcastToRoom(oldRoom, {
                type: 'user-left',
                userId
              }, ws)
            }
          }
          
          // Join new room
          currentRoom = roomId
          room.participants.set(userId, ws)
          
          // Notify user of successful join
          ws.send(JSON.stringify({
            type: 'room-joined',
            roomId,
            userId,
            participants: Array.from(room.participants.keys())
              .filter(id => id !== userId)
              .map(id => ({ userId: id }))
          }))
          
          // Notify others in room
          broadcastToRoom(room, {
            type: 'user-joined',
            userId
          }, ws)
          
          console.log(`User ${userId} joined room ${roomId}`)
          break
          
        case 'leave-room':
        case 'leave':
          if (currentRoom && userId) {
            const room = rooms.get(currentRoom)
            if (room) {
              room.participants.delete(userId)
              broadcastToRoom(room, {
                type: 'user-left',
                userId
              }, ws)
            }
            currentRoom = null
          }
          break
          
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          if (!currentRoom) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Not in a room'
            }))
            return
          }
          
          const room = rooms.get(currentRoom)
          if (room) {
            // Relay to specific user or broadcast
            if (data.targetUserId) {
              const targetWs = room.participants.get(data.targetUserId)
              if (targetWs && targetWs.readyState === WebSocket.READY_STATE_OPEN) {
                targetWs.send(JSON.stringify({
                  type: data.type,
                  userId,
                  data: data.offer || data.answer || data.candidate || data.data
                }))
              }
            } else {
              broadcastToRoom(room, {
                type: data.type,
                userId,
                targetUserId: data.targetUserId,
                data: data.offer || data.answer || data.candidate || data.data
              }, ws)
            }
          }
          break
      }
    } catch (error) {
      console.error('Message handling error:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }))
    }
  })
  
  ws.addEventListener('close', () => {
    console.log(`WebSocket disconnected: ${userId}`)
    
    // Clean up on disconnect
    if (currentRoom && userId) {
      const room = rooms.get(currentRoom)
      if (room) {
        room.participants.delete(userId)
        
        // Notify others
        broadcastToRoom(room, {
          type: 'user-left',
          userId
        }, ws)
        
        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(currentRoom)
          console.log(`Room ${currentRoom} deleted (empty)`)
        }
      }
    }
  })
}

// Broadcast to all participants in a room
function broadcastToRoom(room: Room, message: any, exclude?: WebSocket) {
  const msg = JSON.stringify(message)
  room.participants.forEach((ws, userId) => {
    if (ws !== exclude && ws.readyState === WebSocket.READY_STATE_OPEN) {
      ws.send(msg)
    }
  })
}