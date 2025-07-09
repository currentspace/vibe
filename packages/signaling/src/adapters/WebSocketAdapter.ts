/**
 * WebSocket connection adapter for Cloudflare Workers
 * Handles native WebSocket connections
 */

import { ConnectionAdapter, SignalingMessage } from '../core/types'

export class WebSocketAdapter implements ConnectionAdapter {
  private connections = new Map<string, WebSocket>()
  private roomMemberships = new Map<string, Set<string>>() // roomId -> connectionIds

  registerConnection(ws: WebSocket): string {
    const connectionId = crypto.randomUUID()
    this.connections.set(connectionId, ws)
    return connectionId
  }

  unregisterConnection(connectionId: string): void {
    // Remove from all rooms
    this.roomMemberships.forEach((members) => {
      members.delete(connectionId)
    })
    this.connections.delete(connectionId)
  }

  addToRoom(connectionId: string, roomId: string): void {
    if (!this.roomMemberships.has(roomId)) {
      this.roomMemberships.set(roomId, new Set())
    }
    this.roomMemberships.get(roomId)!.add(connectionId)
  }

  removeFromRoom(connectionId: string, roomId: string): void {
    const room = this.roomMemberships.get(roomId)
    if (room) {
      room.delete(connectionId)
      if (room.size === 0) {
        this.roomMemberships.delete(roomId)
      }
    }
  }

  send(connectionId: string, message: SignalingMessage): void {
    const ws = this.connections.get(connectionId)
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message))
    }
  }

  broadcast(roomId: string, message: SignalingMessage, excludeId?: string): void {
    const room = this.roomMemberships.get(roomId)
    if (!room) return

    const msg = JSON.stringify(message)
    room.forEach(connectionId => {
      if (connectionId !== excludeId) {
        const ws = this.connections.get(connectionId)
        if (ws && ws.readyState === 1) { // WebSocket.OPEN
          ws.send(msg)
        }
      }
    })
  }

  close(connectionId: string): void {
    const ws = this.connections.get(connectionId)
    if (ws) {
      ws.close()
      this.unregisterConnection(connectionId)
    }
  }
}