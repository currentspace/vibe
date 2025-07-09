/**
 * Core signaling business logic
 * Platform-agnostic implementation
 */

import type { 
  Room, 
  Participant, 
  SignalingMessage, 
  ConnectionAdapter, 
  StorageAdapter
} from '../types'

export class SignalingCore {
  constructor(
    private storage: StorageAdapter,
    private connection: ConnectionAdapter
  ) {}

  /**
   * Handle incoming messages from clients
   */
  async handleMessage(
    connectionId: string,
    message: SignalingMessage
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'join-room':
          await this.handleJoinRoom(connectionId, message)
          break
        
        case 'leave-room':
          await this.handleLeaveRoom(connectionId, message)
          break
        
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          await this.handleWebRTCSignaling(connectionId, message)
          break
        
        default:
          this.sendError(connectionId, 'Unknown message type')
      }
    } catch {
      this.sendError(connectionId, 'Internal server error')
    }
  }

  /**
   * Handle client disconnect
   */
  async handleDisconnect(connectionId: string): Promise<void> {
    // Find and remove from all rooms
    const rooms = await this.storage.getRoomList()
    
    for (const roomId of rooms) {
      const room = await this.storage.getRoom(roomId)
      if (!room) continue
      
      const participant = Array.from(room.participants.values())
        .find(p => p.connectionId === connectionId)
      
      if (participant) {
        await this.storage.removeParticipant(roomId, participant.id)
        
        // Notify other participants
        this.connection.broadcast(roomId, {
          type: 'user-left',
          userId: participant.id
        }, connectionId)
        
        // Clean up empty rooms
        if (room.participants.size === 1) {
          await this.storage.deleteRoom(roomId)
        }
      }
    }
  }

  /**
   * Create a new room
   */
  async createRoom(): Promise<string> {
    const roomId = this.generateRoomId()
    await this.storage.createRoom(roomId)
    return roomId
  }

  /**
   * Get room information
   */
  async getRoomInfo(roomId: string): Promise<Room | null> {
    return this.storage.getRoom(roomId)
  }

  private async handleJoinRoom(
    connectionId: string,
    message: SignalingMessage
  ): Promise<void> {
    const { roomId, userId } = message
    
    if (!roomId) {
      this.sendError(connectionId, 'Room ID is required')
      return
    }
    
    const room = await this.storage.getRoom(roomId)
    if (!room) {
      this.sendError(connectionId, 'Room not found')
      return
    }
    
    const participantId = userId || this.generateUserId()
    const participant: Participant = {
      id: participantId,
      connectionId,
      joinedAt: new Date()
    }
    
    await this.storage.addParticipant(roomId, participant)
    
    // Send current participants to new user
    const participants = Array.from(room.participants.values())
      .filter(p => p.id !== participantId)
      .map(p => ({ userId: p.id }))
    
    this.connection.send(connectionId, {
      type: 'room-joined',
      roomId,
      userId: participantId,
      data: { participants }
    })
    
    // Notify others
    this.connection.broadcast(roomId, {
      type: 'user-joined',
      userId: participantId
    }, connectionId)
  }

  private async handleLeaveRoom(
    connectionId: string,
    message: SignalingMessage
  ): Promise<void> {
    const { roomId, userId } = message
    
    if (!roomId || !userId) {
      this.sendError(connectionId, 'Room ID and User ID are required')
      return
    }
    
    await this.storage.removeParticipant(roomId, userId)
    
    // Notify others
    this.connection.broadcast(roomId, {
      type: 'user-left',
      userId
    }, connectionId)
    
    // Clean up empty room
    const room = await this.storage.getRoom(roomId)
    if (room && room.participants.size === 0) {
      await this.storage.deleteRoom(roomId)
    }
  }

  private async handleWebRTCSignaling(
    connectionId: string,
    message: SignalingMessage
  ): Promise<void> {
    const { roomId, targetUserId, type, data } = message
    
    if (!roomId) {
      this.sendError(connectionId, 'Room ID is required')
      return
    }
    
    const room = await this.storage.getRoom(roomId)
    if (!room) {
      this.sendError(connectionId, 'Room not found')
      return
    }
    
    // Find sender
    const sender = Array.from(room.participants.values())
      .find(p => p.connectionId === connectionId)
    
    if (!sender) {
      this.sendError(connectionId, 'You are not in this room')
      return
    }
    
    // Relay to specific user or broadcast
    if (targetUserId) {
      const target = room.participants.get(targetUserId)
      if (target) {
        this.connection.send(target.connectionId, {
          type,
          userId: sender.id,
          data
        })
      }
    } else {
      this.connection.broadcast(roomId, {
        type,
        userId: sender.id,
        targetUserId,
        data
      }, connectionId)
    }
  }

  private sendError(connectionId: string, message: string): void {
    this.connection.send(connectionId, {
      type: 'error',
      data: { message }
    })
  }

  private generateRoomId(): string {
    return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}