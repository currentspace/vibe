/**
 * WebRTC Context Provider
 * 
 * This context manages the WebRTC connection state, room management,
 * and signaling server communication. It provides the core functionality
 * for establishing peer-to-peer connections.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { SignalingClient } from '@vibe/api'
import type { Participant } from '@vibe/core'
import { ConnectionState, ConnectionStateManager } from '@vibe/core'

export interface WebRTCContextValue {
  // Connection state
  connectionState: ConnectionState
  isConnected: boolean
  error: string | null
  
  // Room state
  currentRoom: string | null
  participants: Participant[]
  localUserId: string | null
  
  // Peer connections
  peerConnections: Map<string, RTCPeerConnection>
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  
  // Actions
  connect: (url?: string) => Promise<void>
  disconnect: () => void
  createRoom: () => Promise<string>
  joinRoom: (roomId: string) => Promise<void>
  leaveRoom: () => void
  
  // Media controls
  startLocalStream: (constraints?: MediaStreamConstraints) => Promise<void>
  stopLocalStream: () => void
  toggleAudio: (enabled?: boolean) => void
  toggleVideo: (enabled?: boolean) => void
}

const WebRTCContext = createContext<WebRTCContextValue | undefined>(undefined)

export interface WebRTCProviderProps {
  children: ReactNode
  signalingUrl?: string
  iceServers?: RTCIceServer[]
  mediaConstraints?: MediaStreamConstraints
}

export function WebRTCProvider({ 
  children, 
  signalingUrl,
  iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
  mediaConstraints
}: WebRTCProviderProps) {
  // State management
  const [connectionStateManager] = useState(() => new ConnectionStateManager())
  const [connectionState, setConnectionState] = useState(ConnectionState.NEW)
  const [error, setError] = useState<string | null>(null)
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localUserId, setLocalUserId] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  
  // Refs
  const signalingClient = useRef<SignalingClient | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  
  // Update connection state
  const updateConnectionState = useCallback((state: ConnectionState, reason?: string) => {
    connectionStateManager.setState(state, reason)
    setConnectionState(state)
  }, [connectionStateManager])
  
  // Connect to signaling server
  const connect = useCallback(async (url?: string) => {
    if (signalingClient.current?.isConnected) {
      return
    }
    
    try {
      updateConnectionState(ConnectionState.CONNECTING)
      setError(null)
      
      const client = new SignalingClient({ url: url || signalingUrl })
      signalingClient.current = client
      
      // Set up event handlers
      client.on('connected', () => {
        updateConnectionState(ConnectionState.CONNECTED)
      })
      
      client.on('disconnected', () => {
        updateConnectionState(ConnectionState.DISCONNECTED)
        setCurrentRoom(null)
        setParticipants([])
      })
      
      client.on('error', (err) => {
        setError(err.message)
        updateConnectionState(ConnectionState.FAILED, err.message)
      })
      
      client.on('room-joined', ({ roomId, userId, participants }) => {
        setCurrentRoom(roomId)
        setLocalUserId(userId)
        setParticipants(participants)
      })
      
      client.on('user-joined', ({ userId }) => {
        setParticipants(prev => {
          if (prev.find(p => p.id === userId)) return prev
          return [...prev, { 
            id: userId, 
            connectionId: '', 
            joinedAt: new Date() 
          }]
        })
        // Create offer for new participant
        createPeerConnection(userId, true)
      })
      
      client.on('user-left', ({ userId }) => {
        setParticipants(prev => prev.filter(p => p.id !== userId))
        closePeerConnection(userId)
      })
      
      client.on('offer', async ({ userId, offer }) => {
        const pc = await createPeerConnection(userId, false)
        await pc.setRemoteDescription(offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        client.sendAnswer(userId, answer)
      })
      
      client.on('answer', async ({ userId, answer }) => {
        const pc = peerConnections.current.get(userId)
        if (pc) {
          await pc.setRemoteDescription(answer)
        }
      })
      
      client.on('ice-candidate', async ({ userId, candidate }) => {
        const pc = peerConnections.current.get(userId)
        if (pc) {
          await pc.addIceCandidate(candidate)
        }
      })
      
      await client.connect()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      updateConnectionState(ConnectionState.FAILED)
      throw err
    }
  }, [signalingUrl, updateConnectionState])
  
  // Create peer connection
  const createPeerConnection = useCallback(async (userId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers })
    peerConnections.current.set(userId, pc)
    
    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      const [stream] = event.streams
      setRemoteStreams(prev => new Map(prev).set(userId, stream))
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingClient.current) {
        signalingClient.current.sendIceCandidate(userId, event.candidate)
      }
    }
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeerConnection(userId)
      }
    }
    
    // Create offer if initiator
    if (isInitiator) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      signalingClient.current?.sendOffer(userId, offer)
    }
    
    return pc
  }, [localStream, iceServers])
  
  // Close peer connection
  const closePeerConnection = useCallback((userId: string) => {
    const pc = peerConnections.current.get(userId)
    if (pc) {
      pc.close()
      peerConnections.current.delete(userId)
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev)
      newMap.delete(userId)
      return newMap
    })
  }, [])
  
  // Disconnect from signaling server
  const disconnect = useCallback(() => {
    // Close all peer connections
    peerConnections.current.forEach((pc, userId) => {
      closePeerConnection(userId)
    })
    
    // Disconnect signaling
    signalingClient.current?.disconnect()
    signalingClient.current = null
    
    updateConnectionState(ConnectionState.CLOSED)
    setCurrentRoom(null)
    setParticipants([])
    setLocalUserId(null)
  }, [closePeerConnection, updateConnectionState])
  
  // Create room
  const createRoom = useCallback(async () => {
    if (!signalingClient.current) {
      throw new Error('Not connected to signaling server')
    }
    return signalingClient.current.createRoom()
  }, [])
  
  // Join room
  const joinRoom = useCallback(async (roomId: string) => {
    if (!signalingClient.current) {
      throw new Error('Not connected to signaling server')
    }
    signalingClient.current.joinRoom(roomId)
  }, [])
  
  // Leave room
  const leaveRoom = useCallback(() => {
    if (!signalingClient.current || !currentRoom) {
      return
    }
    
    // Close all peer connections
    participants.forEach(p => closePeerConnection(p.id))
    
    signalingClient.current.leaveRoom()
    setCurrentRoom(null)
    setParticipants([])
  }, [currentRoom, participants, closePeerConnection])
  
  // Start local stream
  const startLocalStream = useCallback(async (constraints?: MediaStreamConstraints) => {
    try {
      const stream = await window.navigator.mediaDevices.getUserMedia(
        constraints || mediaConstraints || { video: true, audio: true }
      )
      setLocalStream(stream)
      
      // Add tracks to existing peer connections
      peerConnections.current.forEach((pc) => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream)
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access media devices')
      throw err
    }
  }, [mediaConstraints])
  
  // Stop local stream
  const stopLocalStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
  }, [localStream])
  
  // Toggle audio
  const toggleAudio = useCallback((enabled?: boolean) => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = enabled !== undefined ? enabled : !track.enabled
      })
    }
  }, [localStream])
  
  // Toggle video
  const toggleVideo = useCallback((enabled?: boolean) => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = enabled !== undefined ? enabled : !track.enabled
      })
    }
  }, [localStream])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
      stopLocalStream()
    }
  }, [disconnect, stopLocalStream])
  
  const value: WebRTCContextValue = {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    error,
    currentRoom,
    participants,
    localUserId,
    peerConnections: peerConnections.current,
    localStream,
    remoteStreams,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    startLocalStream,
    stopLocalStream,
    toggleAudio,
    toggleVideo,
  }
  
  return (
    <WebRTCContext.Provider value={value}>
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