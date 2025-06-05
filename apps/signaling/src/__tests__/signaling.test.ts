import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app, httpServer } from '../index'
import { io as ioclient, Socket } from 'socket.io-client'

describe('Signaling Server', () => {
  afterAll(() => {
    return new Promise<void>((resolve) => {
      httpServer.close(() => resolve())
    })
  })

  describe('REST API', () => {
    it('should return health check', async () => {
      const response = await request(app).get('/health')
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
    })

    it('should create a new room', async () => {
      const response = await request(app).post('/api/rooms')
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('roomId')
      expect(typeof response.body.roomId).toBe('string')
    })

    it('should get room info', async () => {
      // First create a room
      const createResponse = await request(app).post('/api/rooms')
      const { roomId } = createResponse.body

      // Then get room info
      const getResponse = await request(app).get(`/api/rooms/${roomId}`)
      expect(getResponse.status).toBe(200)
      expect(getResponse.body).toHaveProperty('id', roomId)
      expect(getResponse.body).toHaveProperty('participants')
      expect(Array.isArray(getResponse.body.participants)).toBe(true)
      expect(getResponse.body).toHaveProperty('createdAt')
    })

    it('should return 404 for non-existent room', async () => {
      const response = await request(app).get('/api/rooms/non-existent-room')
      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Room not found')
    })
  })

  describe('WebSocket', () => {
    let clientSocket: Socket
    let serverPort: number

    beforeAll(() => {
      const address = httpServer.address()
      if (address && typeof address !== 'string') {
        serverPort = address.port
      }
    })

    beforeEach(() => {
      return new Promise<void>((resolve) => {
        clientSocket = ioclient(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
        })
        clientSocket.on('connect', resolve)
      })
    })

    afterEach(() => {
      if (clientSocket.connected) {
        clientSocket.disconnect()
      }
    })

    it('should connect to socket', () => {
      expect(clientSocket.connected).toBe(true)
    })

    it('should join a room', async () => {
      // Create a room first
      const response = await request(app).post('/api/rooms')
      const { roomId } = response.body

      return new Promise<void>((resolve) => {
        clientSocket.emit('join-room', roomId, 'user123')
        
        clientSocket.on('room-participants', (data) => {
          expect(data).toHaveProperty('participants')
          expect(Array.isArray(data.participants)).toBe(true)
          resolve()
        })
      })
    })

    it('should handle non-existent room join', () => {
      return new Promise<void>((resolve) => {
        clientSocket.emit('join-room', 'non-existent-room', 'user123')
        
        clientSocket.on('error', (data) => {
          expect(data).toHaveProperty('message', 'Room not found')
          resolve()
        })
      })
    })
  })
})