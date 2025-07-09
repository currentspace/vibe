/**
 * Simple Cloudflare Worker implementation
 * Uses in-memory storage (no persistence)
 */

import { SignalingCore } from '../core/SignalingCore'
import { MemoryStorageAdapter } from '../adapters/MemoryStorageAdapter'
import { WebSocketAdapter } from '../adapters/WebSocketAdapter'
import { SignalingMessage } from '../core/types'

export interface Env {
  // Environment bindings
}

// Global instances (reset on worker restart)
const storage = new MemoryStorageAdapter()
const connections = new WebSocketAdapter()
const signaling = new SignalingCore(storage, connections)

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

    // WebSocket endpoint
    if (url.pathname === '/ws' || url.pathname.startsWith('/ws/')) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 400 })
      }

      const { 0: client, 1: server } = new WebSocketPair()
      handleWebSocket(server)
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    // REST API endpoints
    try {
      // Create room
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        const roomId = await signaling.createRoom()
        return Response.json({ roomId }, { headers: corsHeaders })
      }

      // Get room info
      if (url.pathname.match(/^\/api\/rooms\/[\w-]+$/) && request.method === 'GET') {
        const roomId = url.pathname.split('/').pop()!
        const room = await signaling.getRoomInfo(roomId)
        
        if (!room) {
          return Response.json(
            { error: 'Room not found' }, 
            { status: 404, headers: corsHeaders }
          )
        }
        
        return Response.json({
          roomId: room.id,
          createdAt: room.createdAt.toISOString(),
          participantCount: room.participants.size
        }, { headers: corsHeaders })
      }

      // Health check
      if (url.pathname === '/health') {
        return Response.json({
          status: 'healthy',
          mode: 'simple-worker',
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders })
      
    } catch (error) {
      console.error('Request error:', error)
      return Response.json(
        { error: 'Internal server error' }, 
        { status: 500, headers: corsHeaders }
      )
    }
  }
}

function handleWebSocket(ws: WebSocket) {
  ws.accept()
  
  const connectionId = connections.registerConnection(ws)
  console.log(`WebSocket connected: ${connectionId}`)
  
  ws.addEventListener('message', async (event) => {
    try {
      const message = JSON.parse(event.data as string) as SignalingMessage
      
      // Track room membership for WebSocket adapter
      if (message.type === 'join-room' && message.roomId) {
        connections.addToRoom(connectionId, message.roomId)
      } else if (message.type === 'leave-room' && message.roomId) {
        connections.removeFromRoom(connectionId, message.roomId)
      }
      
      await signaling.handleMessage(connectionId, message)
    } catch (error) {
      console.error('Message error:', error)
      connections.send(connectionId, {
        type: 'error',
        data: { message: 'Invalid message format' }
      })
    }
  })
  
  ws.addEventListener('close', async () => {
    console.log(`WebSocket disconnected: ${connectionId}`)
    await signaling.handleDisconnect(connectionId)
    connections.unregisterConnection(connectionId)
  })
}