/**
 * WebRTC Signaling Server
 * 
 * This server facilitates WebRTC peer connections by handling signaling
 * between clients. It manages rooms and relays connection information
 * but does not handle media streams directly.
 * 
 * @module SignalingServer
 */

import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import { setupApiDocs } from './api-docs'

const app = express()
const httpServer = createServer(app)

// Configure Socket.IO with CORS
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

// Setup API documentation (only in development)
if (process.env.NODE_ENV !== 'production') {
  setupApiDocs(app)
}

/**
 * Room data structure for managing WebRTC sessions
 */
interface Room {
  /** Unique room identifier (UUID v4) */
  id: string
  /** Set of participant user IDs currently in the room */
  participants: Set<string>
  /** Timestamp when the room was created */
  createdAt: Date
}

/** In-memory storage for active rooms */
const rooms = new Map<string, Room>()

// ==================== REST API Endpoints ====================

/**
 * Health check endpoint
 * @route GET /health
 * @returns {Object} Server status and current timestamp
 */
app.get('/health', ((req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
}) as RequestHandler)

/**
 * Create a new room for WebRTC session
 * @route POST /api/rooms
 * @returns {Object} Created room ID
 */
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

/**
 * Get room information by ID
 * @route GET /api/rooms/:roomId
 * @param {string} roomId - Room ID to retrieve
 * @returns {Object} Room details including participants
 * @returns {404} If room not found
 */
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

/**
 * 404 handler for unmatched routes
 */
app.use(((req, res) => {
  res.status(404).json({ error: 'Not found' })
}) as RequestHandler)

/**
 * Global error handling middleware
 * Logs errors and returns appropriate error response
 */
app.use(((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
}) as express.ErrorRequestHandler)

// ==================== WebSocket Event Handlers ====================

/**
 * Handle WebSocket connections for real-time signaling
 */
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  
  /**
   * Handle room join request
   * @event join-room
   * @param {string} roomId - Room to join
   * @param {string} userId - User identifier
   */
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
  
  /**
   * Handle room leave request
   * @event leave-room
   * @param {string} roomId - Room to leave
   * @param {string} userId - User identifier
   */
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
  
  /**
   * Relay WebRTC offer to target peer
   * @event offer
   * @param {Object} data - Offer data
   * @param {string} data.roomId - Room ID
   * @param {string} data.userId - Sender user ID
   * @param {string} data.targetUserId - Target user ID
   * @param {RTCSessionDescriptionInit} data.offer - WebRTC offer
   */
  socket.on('offer', ({ roomId, userId, targetUserId, offer }) => {
    socket.to(roomId).emit('offer', { userId, targetUserId, offer })
  })
  
  /**
   * Relay WebRTC answer to target peer
   * @event answer
   * @param {Object} data - Answer data
   * @param {string} data.roomId - Room ID
   * @param {string} data.userId - Sender user ID
   * @param {string} data.targetUserId - Target user ID
   * @param {RTCSessionDescriptionInit} data.answer - WebRTC answer
   */
  socket.on('answer', ({ roomId, userId, targetUserId, answer }) => {
    socket.to(roomId).emit('answer', { userId, targetUserId, answer })
  })
  
  /**
   * Relay ICE candidate to target peer
   * @event ice-candidate
   * @param {Object} data - ICE candidate data
   * @param {string} data.roomId - Room ID
   * @param {string} data.userId - Sender user ID
   * @param {string} data.targetUserId - Target user ID
   * @param {RTCIceCandidateInit} data.candidate - ICE candidate
   */
  socket.on('ice-candidate', ({ roomId, userId, targetUserId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { userId, targetUserId, candidate })
  })
  
  /**
   * Handle client disconnection
   * @event disconnect
   */
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