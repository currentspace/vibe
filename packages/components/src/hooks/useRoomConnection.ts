/**
 * Hook for managing room connections
 */

import { useState, useCallback, useEffect } from 'react'
import { useWebRTC } from '../contexts/WebRTCContext'

export interface UseRoomConnectionOptions {
  autoConnect?: boolean
  signalingUrl?: string
}

export function useRoomConnection(options: UseRoomConnectionOptions = {}) {
  const { autoConnect = false, signalingUrl } = options
  const webrtc = useWebRTC()
  
  const [isJoining, setIsJoining] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  const createAndJoinRoom = useCallback(async () => {
    if (!webrtc.isConnected) {
      throw new Error('Not connected to signaling server')
    }
    
    setIsCreating(true)
    
    try {
      const roomId = await webrtc.createRoom()
      await webrtc.joinRoom(roomId)
      return roomId
    } finally {
      setIsCreating(false)
    }
  }, [webrtc])
  
  const joinRoom = useCallback(async (roomId: string) => {
    if (!webrtc.isConnected) {
      throw new Error('Not connected to signaling server')
    }
    
    setIsJoining(true)
    
    try {
      await webrtc.joinRoom(roomId)
    } finally {
      setIsJoining(false)
    }
  }, [webrtc])
  
  const leaveRoom = useCallback(() => {
    webrtc.leaveRoom()
  }, [webrtc])
  
  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect && !webrtc.isConnected) {
      webrtc.connect(signalingUrl).catch(() => {
        // Error is handled in the WebRTC context
      })
    }
  }, [autoConnect, signalingUrl, webrtc])
  
  return {
    // State
    isConnected: webrtc.isConnected,
    connectionState: webrtc.connectionState,
    currentRoom: webrtc.currentRoom,
    participants: webrtc.participants,
    localUserId: webrtc.localUserId,
    error: webrtc.error,
    
    // Loading states
    isJoining,
    isCreating,
    
    // Actions
    connect: webrtc.connect,
    disconnect: webrtc.disconnect,
    createAndJoinRoom,
    joinRoom,
    leaveRoom,
  }
}