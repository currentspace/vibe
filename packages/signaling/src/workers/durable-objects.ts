/**
 * Cloudflare Durable Objects implementation
 * Each room is a separate Durable Object instance
 */

import { DurableObject } from 'cloudflare:workers'
import { SignalingCore } from '../core/SignalingCore'
import { StorageAdapter, Room, Participant } from '@vibe/core'
import { WebSocketAdapter } from '../adapters/WebSocketAdapter'

// Durable Object storage adapter
class DurableStorageAdapter implements StorageAdapter {
  constructor(private state: DurableObjectState) {}

  async createRoom(roomId: string): Promise<Room> {
    const room: Room = {
      id: roomId,
      createdAt: new Date(),
      participants: new Map()
    }
    await this.state.storage.put('room', room)
    return room
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const data = await this.state.storage.get('room')
    if (!data) return null
    
    // Reconstruct Map from stored data
    const room = data as any
    room.participants = new Map(Object.entries(room.participants || {}))
    return room
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.state.storage.delete('room')
  }

  async addParticipant(roomId: string, participant: Participant): Promise<void> {
    const room = await this.getRoom(roomId)
    if (room) {
      room.participants.set(participant.id, participant)
      await this.saveRoom(room)
    }
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoom(roomId)
    if (room) {
      room.participants.delete(userId)
      await this.saveRoom(room)
    }
  }

  async getRoomList(): Promise<string[]> {
    const room = await this.getRoom('')
    return room ? [room.id] : []
  }

  private async saveRoom(room: Room): Promise<void> {
    // Convert Map to object for storage
    const roomData = {
      ...room,
      participants: Object.fromEntries(room.participants)
    }
    await this.state.storage.put('room', roomData)
  }
}

export class SignalingRoom extends DurableObject {
  private connections: WebSocketAdapter
  private storage: DurableStorageAdapter
  private signaling: SignalingCore

  constructor(state: DurableObjectState, env: any) {
    super(state, env)
    this.connections = new WebSocketAdapter()
    this.storage = new DurableStorageAdapter(state)
    this.signaling = new SignalingCore(this.storage, this.connections)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    // WebSocket connection
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair()
      
      await this.handleWebSocket(server, url.pathname)
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    // Get room info
    if (request.method === 'GET') {
      const roomId = this.state.id.toString()
      const room = await this.storage.getRoom(roomId)
      
      if (!room) {
        // Initialize room on first access
        await this.storage.createRoom(roomId)
      }
      
      return Response.json({
        roomId,
        exists: !!room,
        participantCount: room?.participants.size || 0
      })
    }

    return new Response('Method not allowed', { status: 405 })
  }

  private async handleWebSocket(ws: WebSocket, pathname: string) {
    ws.accept()
    
    const connectionId = this.connections.registerConnection(ws)
    const roomId = this.state.id.toString()
    
    // Auto-join room on connect if room ID in path
    if (pathname.includes(roomId)) {
      this.connections.addToRoom(connectionId, roomId)
    }
    
    ws.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data as string)
        
        // Ensure room ID is set
        message.roomId = message.roomId || roomId
        
        // Track room membership
        if (message.type === 'join-room') {
          this.connections.addToRoom(connectionId, roomId)
        } else if (message.type === 'leave-room') {
          this.connections.removeFromRoom(connectionId, roomId)
        }
        
        await this.signaling.handleMessage(connectionId, message)
      } catch (error) {
        console.error('Message error:', error)
        this.connections.send(connectionId, {
          type: 'error',
          data: { message: 'Invalid message format' }
        })
      }
    })
    
    ws.addEventListener('close', async () => {
      await this.signaling.handleDisconnect(connectionId)
      this.connections.unregisterConnection(connectionId)
    })
  }
}

// Main worker that routes to Durable Objects
export interface Env {
  SIGNALING_ROOMS: DurableObjectNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // WebSocket connection to room
    if (url.pathname.startsWith('/ws/')) {
      const roomId = url.pathname.split('/')[2]
      if (!roomId) {
        return new Response('Room ID required', { status: 400 })
      }

      // Get or create room Durable Object
      const id = env.SIGNALING_ROOMS.idFromName(roomId)
      const room = env.SIGNALING_ROOMS.get(id)
      
      return room.fetch(request)
    }

    // Create room
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const roomId = crypto.randomUUID()
      
      // Pre-create the Durable Object
      const id = env.SIGNALING_ROOMS.idFromName(roomId)
      const room = env.SIGNALING_ROOMS.get(id)
      await room.fetch(new Request('http://internal/init'))
      
      return Response.json({ roomId }, { headers: corsHeaders })
    }

    // Get room info
    if (url.pathname.match(/^\/api\/rooms\/[\w-]+$/) && request.method === 'GET') {
      const roomId = url.pathname.split('/').pop()!
      
      const id = env.SIGNALING_ROOMS.idFromName(roomId)
      const room = env.SIGNALING_ROOMS.get(id)
      
      const response = await room.fetch(request)
      const data = await response.json()
      
      return Response.json(data, { headers: corsHeaders })
    }

    // Health check
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        mode: 'durable-objects',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  }
}