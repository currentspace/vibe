/**
 * SignalingClient - WebRTC signaling client implementation
 */

import { io, Socket } from 'socket.io-client'
import type { 
  SignalingMessage, 
  Participant
} from '@vibe/core'

export interface SignalingClientOptions {
  url?: string
  autoConnect?: boolean
  transports?: string[]
}

export interface SignalingEvents {
  connected: () => void
  disconnected: () => void
  error: (error: Error) => void
  'room-joined': (data: { roomId: string; userId: string; participants: Participant[] }) => void
  'user-joined': (data: { userId: string }) => void
  'user-left': (data: { userId: string }) => void
  offer: (data: { userId: string; offer: RTCSessionDescriptionInit }) => void
  answer: (data: { userId: string; answer: RTCSessionDescriptionInit }) => void
  'ice-candidate': (data: { userId: string; candidate: RTCIceCandidateInit }) => void
}

export class SignalingClient {
  private socket: Socket | null = null
  private currentRoom: string | null = null
  private userId: string | null = null
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private eventHandlers = new Map<keyof SignalingEvents, Set<Function>>()

  constructor(private options: SignalingClientOptions = {}) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.options.url || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SIGNALING_URL : undefined) || 'http://localhost:4000'
      
      this.socket = io(url, {
        autoConnect: this.options.autoConnect ?? true,
        transports: this.options.transports || ['websocket'],
      })

      this.socket.on('connect', () => {
        this.emit('connected')
        resolve()
      })

      this.socket.on('disconnect', () => {
        this.emit('disconnected')
      })

      this.socket.on('error', (error: unknown) => {
        this.emit('error', new Error(typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Socket error'))
        reject(error)
      })

      this.setupMessageHandlers()
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.currentRoom = null
    this.userId = null
  }

  async createRoom(): Promise<string> {
    if (typeof fetch === 'undefined') {
      throw new Error('fetch is not available in this environment')
    }
    const response = await fetch(`${this.options.url || 'http://localhost:4000'}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      throw new Error('Failed to create room')
    }
    
    const { roomId } = await response.json()
    return roomId
  }

  joinRoom(roomId: string, userId?: string): void {
    if (!this.socket) {
      throw new Error('Not connected to signaling server')
    }
    
    this.currentRoom = roomId
    this.socket.emit('join-room', roomId, userId)
  }

  leaveRoom(): void {
    if (!this.socket || !this.currentRoom) {
      return
    }
    
    this.socket.emit('leave-room', this.currentRoom, this.userId)
    this.currentRoom = null
  }

  sendOffer(targetUserId: string, offer: RTCSessionDescriptionInit): void {
    this.sendSignalingMessage({
      type: 'offer',
      roomId: this.currentRoom!,
      userId: this.userId!,
      targetUserId,
      data: offer,
    })
  }

  sendAnswer(targetUserId: string, answer: RTCSessionDescriptionInit): void {
    this.sendSignalingMessage({
      type: 'answer',
      roomId: this.currentRoom!,
      userId: this.userId!,
      targetUserId,
      data: answer,
    })
  }

  sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit): void {
    this.sendSignalingMessage({
      type: 'ice-candidate',
      roomId: this.currentRoom!,
      userId: this.userId!,
      targetUserId,
      data: candidate,
    })
  }

  on<K extends keyof SignalingEvents>(event: K, handler: SignalingEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off<K extends keyof SignalingEvents>(event: K, handler: SignalingEvents[K]): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  private emit<K extends keyof SignalingEvents>(
    event: K,
    ...args: Parameters<SignalingEvents[K]>
  ): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(...args))
    }
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    if (!this.socket) {
      throw new Error('Not connected to signaling server')
    }
    
    this.socket.emit(message.type, message)
  }

  private setupMessageHandlers(): void {
    if (!this.socket) return

    this.socket.on('room-joined', (data: unknown) => {
      const typedData = data as { userId: string; roomId: string; data?: { participants: Participant[] } }
      this.userId = typedData.userId
      this.emit('room-joined', {
        roomId: typedData.roomId,
        userId: typedData.userId,
        participants: typedData.data?.participants || [],
      })
    })

    this.socket.on('user-joined', (data: unknown) => {
      const typedData = data as { userId: string }
      this.emit('user-joined', { userId: typedData.userId })
    })

    this.socket.on('user-left', (data: unknown) => {
      const typedData = data as { userId: string }
      this.emit('user-left', { userId: typedData.userId })
    })

    this.socket.on('offer', (data: unknown) => {
      const typedData = data as { userId: string; data: RTCSessionDescriptionInit }
      this.emit('offer', {
        userId: typedData.userId,
        offer: typedData.data,
      })
    })

    this.socket.on('answer', (data: unknown) => {
      const typedData = data as { userId: string; data: RTCSessionDescriptionInit }
      this.emit('answer', {
        userId: typedData.userId,
        answer: typedData.data,
      })
    })

    this.socket.on('ice-candidate', (data: unknown) => {
      const typedData = data as { userId: string; data: RTCIceCandidateInit }
      this.emit('ice-candidate', {
        userId: typedData.userId,
        candidate: typedData.data,
      })
    })
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get roomId(): string | null {
    return this.currentRoom
  }

  get currentUserId(): string | null {
    return this.userId
  }
}