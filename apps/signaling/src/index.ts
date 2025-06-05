import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 4000

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}))
app.use(express.json())

// Store active rooms and their participants
interface Room {
  id: string
  participants: Set<string>
  createdAt: Date
}

const rooms = new Map<string, Room>()

// REST API endpoints
app.get('/health', ((req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
}) as RequestHandler)

// Create a new room
app.post('/api/rooms', ((req, res) => {
  const roomId = uuidv4()
  const room = {
    id: roomId,
    participants: new Set<string>(),
    createdAt: new Date()
  }
  rooms.set(roomId, room)
  res.json({ roomId })
}) as RequestHandler)

// Get room info
app.get('/api/rooms/:roomId', ((req, res) => {
  const { roomId } = req.params
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' })
  }
  
  res.json({
    id: room.id,
    participants: Array.from(room.participants),
    createdAt: room.createdAt
  })
}) as RequestHandler)

// 404 handler - must be before error handler
app.use(((req, res) => {
  res.status(404).json({ error: 'Not found' })
}) as RequestHandler)

// Error handling middleware (Express 5 requires 4 parameters)
app.use(((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
}) as express.ErrorRequestHandler)

// WebSocket handling for real-time signaling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  
  // Join a room
  socket.on('join-room', (roomId: string, userId: string) => {
    const room = rooms.get(roomId)
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }
    
    socket.join(roomId)
    room.participants.add(userId)
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', { userId })
    
    // Send current participants to the new user
    socket.emit('room-participants', {
      participants: Array.from(room.participants).filter(id => id !== userId)
    })
    
    console.log(`User ${userId} joined room ${roomId}`)
  })
  
  // Leave a room
  socket.on('leave-room', (roomId: string, userId: string) => {
    const room = rooms.get(roomId)
    if (room) {
      room.participants.delete(userId)
      socket.leave(roomId)
      socket.to(roomId).emit('user-left', { userId })
      
      // Clean up empty rooms
      if (room.participants.size === 0) {
        rooms.delete(roomId)
      }
    }
  })
  
  // WebRTC signaling
  socket.on('offer', ({ roomId, userId, targetUserId, offer }) => {
    socket.to(roomId).emit('offer', { userId, targetUserId, offer })
  })
  
  socket.on('answer', ({ roomId, userId, targetUserId, answer }) => {
    socket.to(roomId).emit('answer', { userId, targetUserId, answer })
  })
  
  socket.on('ice-candidate', ({ roomId, userId, targetUserId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { userId, targetUserId, candidate })
  })
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`Signaling server running on http://localhost:${PORT}`)
  })
}

export { app, httpServer }