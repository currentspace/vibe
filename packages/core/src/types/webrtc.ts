/**
 * Core WebRTC signaling types
 * Platform-agnostic type definitions
 */

export interface Room {
  id: string
  createdAt: Date
  participants: Map<string, Participant>
}

export interface Participant {
  id: string
  connectionId: string
  joinedAt: Date
  metadata?: Record<string, any>
}

export interface SignalingMessage {
  type: MessageType
  roomId?: string
  userId?: string
  targetUserId?: string
  data?: any
}

export type MessageType = 
  | 'join-room'
  | 'leave-room'
  | 'room-joined'
  | 'room-participants'
  | 'user-joined'
  | 'user-left'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'error'

export interface SignalingEvent {
  type: MessageType
  payload: any
  sender?: string
  timestamp: Date
}

export interface ConnectionAdapter {
  send(connectionId: string, message: SignalingMessage): void
  broadcast(roomId: string, message: SignalingMessage, excludeId?: string): void
  close(connectionId: string): void
}

export interface StorageAdapter {
  createRoom(roomId: string): Promise<Room>
  getRoom(roomId: string): Promise<Room | null>
  deleteRoom(roomId: string): Promise<void>
  addParticipant(roomId: string, participant: Participant): Promise<void>
  removeParticipant(roomId: string, userId: string): Promise<void>
  getRoomList(): Promise<string[]>
}