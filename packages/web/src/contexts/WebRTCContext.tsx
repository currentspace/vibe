/**
 * WebRTC Context Provider
 * 
 * This context manages the WebRTC connection state, room management,
 * and signaling server communication. It provides the core functionality
 * for establishing peer-to-peer connections.
 * 
 * @module WebRTCContext
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

/**
 * Participant in a WebRTC room
 */
interface Participant {
  /** Unique identifier for the participant */
  id: string
  /** Timestamp when the participant joined */
  joinedAt: Date
}

/**
 * WebRTC context value interface
 */
interface WebRTCContextType {
  /** Socket.io connection instance */
  socket: Socket | null
  /** Whether connected to signaling server */
  isConnected: boolean
  /** Current room ID if joined */
  currentRoom: string | null
  /** List of other participants in the room */
  participants: Participant[]
  /** Current connection status */
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  /** Error message if any */
  error: string | null
  /** Create a new room and return its ID */
  createRoom: () => Promise<string>
  /** Join an existing room by ID */
  joinRoom: (roomId: string) => void
  /** Leave the current room */
  leaveRoom: () => void
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined)

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 
  (typeof window !== 'undefined' && window.location.protocol === 'https:' 
    ? 'https://localhost:4000' 
    : 'http://localhost:4000')

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [connectionStatus, setConnectionStatus] = useState<WebRTCContextType['connectionStatus']>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    setConnectionStatus('connecting')
    const newSocket = io(SIGNALING_URL, {
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      setConnectionStatus('connected')
      setError(null)
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      setConnectionStatus('disconnected')
    })

    newSocket.on('connect_error', (err) => {
      setConnectionStatus('error')
      setError(err.message)
    })

    newSocket.on('room-participants', ({ participants: roomParticipants }) => {
      setParticipants(roomParticipants.map((id: string) => ({
        id,
        joinedAt: new Date()
      })))
    })

    newSocket.on('user-joined', ({ userId: newUserId }) => {
      setParticipants(prev => [...prev, { id: newUserId, joinedAt: new Date() }])
    })

    newSocket.on('user-left', ({ userId: leftUserId }) => {
      setParticipants(prev => prev.filter(p => p.id !== leftUserId))
    })

    newSocket.on('error', ({ message }) => {
      setError(message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  /**
   * Create a new room on the signaling server
   * @returns {Promise<string>} The created room ID
   * @throws {Error} If room creation fails
   */
  const createRoom = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch(`${SIGNALING_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const { roomId } = await response.json()
      return roomId
    } catch (err) {
      setError('Failed to create room')
      throw err
    }
  }, [])

  /**
   * Join an existing room
   * @param {string} roomId - The room ID to join
   */
  const joinRoom = useCallback((roomId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to signaling server')
      return
    }

    socket.emit('join-room', roomId, userId)
    setCurrentRoom(roomId)
  }, [socket, isConnected, userId])

  /**
   * Leave the current room
   * Notifies other participants and clears local state
   */
  const leaveRoom = useCallback(() => {
    if (!socket || !currentRoom) return

    socket.emit('leave-room', currentRoom, userId)
    setCurrentRoom(null)
    setParticipants([])
  }, [socket, currentRoom, userId])

  return (
    <WebRTCContext.Provider
      value={{
        socket,
        isConnected,
        currentRoom,
        participants,
        connectionStatus,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  )
}

/**
 * Hook to access WebRTC context
 * @returns {WebRTCContextType} The WebRTC context value
 * @throws {Error} If used outside of WebRTCProvider
 */
export function useWebRTC() {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return context
}