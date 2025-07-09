/**
 * Node.js/Express server using refactored signaling core
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { SignalingCore } from '../core/SignalingCore'
import { MemoryStorageAdapter } from '../adapters/MemoryStorageAdapter'
import { SocketIOAdapter } from '../adapters/SocketIOAdapter'
// import { setupApiDocs } from '../api-docs'

const app = express()
const httpServer = createServer(app)

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  transports: ['websocket'],
})

// Initialize signaling system
const storage = new MemoryStorageAdapter()
const connections = new SocketIOAdapter(io)
const signaling = new SignalingCore(storage, connections)

// Middleware
app.use(cors())
app.use(express.json())

// REST API routes
app.post('/api/rooms', async (req, res) => {
  try {
    const roomId = await signaling.createRoom()
    res.json({ roomId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' })
  }
})

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const room = await signaling.getRoomInfo(req.params.roomId)
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }
    
    res.json({
      roomId: room.id,
      createdAt: room.createdAt.toISOString(),
      participantCount: room.participants.size,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room info' })
  }
})

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'nodejs',
    timestamp: new Date().toISOString(),
  })
})

// Setup API documentation
// setupApiDocs(app)

// Socket.io connection handling
io.on('connection', (socket) => {
  const connectionId = connections.registerSocket(socket)
  console.log(`Socket connected: ${connectionId}`)
  
  // Convert Socket.io events to signaling messages
  const events = [
    'join-room',
    'leave-room',
    'offer',
    'answer',
    'ice-candidate'
  ]
  
  events.forEach(event => {
    socket.on(event, async (data, ...args) => {
      try {
        // Handle different Socket.io call patterns
        let message: any = { type: event }
        
        if (event === 'join-room' || event === 'leave-room') {
          // (roomId, userId) pattern
          message.roomId = data
          message.userId = args[0]
        } else {
          // Object pattern
          message = { type: event, ...data }
        }
        
        await signaling.handleMessage(connectionId, message)
      } catch (error) {
        console.error(`Error handling ${event}:`, error)
        socket.emit('error', { message: 'Internal server error' })
      }
    })
  })
  
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${connectionId}`)
    await signaling.handleDisconnect(connectionId)
    connections.unregisterSocket(connectionId)
  })
})

// Start server
const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`)
  console.log(`📡 Mode: Node.js with Socket.io`)
})