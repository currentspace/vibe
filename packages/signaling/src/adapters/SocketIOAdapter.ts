/**
 * Socket.io connection adapter
 * For use with existing Node.js/Express setup
 */

import { Server, Socket } from 'socket.io'
import { ConnectionAdapter, SignalingMessage } from '../core/types'

export class SocketIOAdapter implements ConnectionAdapter {
  private sockets = new Map<string, Socket>()
  
  constructor(private io: Server) {}

  registerSocket(socket: Socket): string {
    const connectionId = socket.id
    this.sockets.set(connectionId, socket)
    return connectionId
  }

  unregisterSocket(connectionId: string): void {
    this.sockets.delete(connectionId)
  }

  send(connectionId: string, message: SignalingMessage): void {
    const socket = this.sockets.get(connectionId)
    if (socket) {
      // Convert to Socket.io event style
      socket.emit(message.type, message.data || message)
    }
  }

  broadcast(roomId: string, message: SignalingMessage, excludeId?: string): void {
    const excludeSocket = excludeId ? this.sockets.get(excludeId) : undefined
    
    if (excludeSocket) {
      // Socket.io room broadcast excluding sender
      excludeSocket.to(roomId).emit(message.type, message.data || message)
    } else {
      // Broadcast to all in room
      this.io.to(roomId).emit(message.type, message.data || message)
    }
  }

  close(connectionId: string): void {
    const socket = this.sockets.get(connectionId)
    if (socket) {
      socket.disconnect(true)
      this.sockets.delete(connectionId)
    }
  }
}