'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

interface Participant {
  id: string
  joinedAt: Date
}

interface WebRTCContextType {
  socket: Socket | null
  isConnected: boolean
  currentRoom: string | null
  participants: Participant[]
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
  createRoom: () => Promise<string>
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined)

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000'

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

  const joinRoom = useCallback((roomId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to signaling server')
      return
    }

    socket.emit('join-room', roomId, userId)
    setCurrentRoom(roomId)
  }, [socket, isConnected, userId])

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

export function useWebRTC() {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return context
}