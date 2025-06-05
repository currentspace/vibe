import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the WebRTC context
vi.mock('@/contexts/WebRTCContext', () => ({
  useWebRTC: vi.fn(() => ({
    socket: null,
    isConnected: false,
    currentRoom: null,
    participants: [],
    connectionStatus: 'disconnected',
    error: null,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
  }))
}))

import { ConnectionStatus } from '../ConnectionStatus'
import { useWebRTC } from '@/contexts/WebRTCContext'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

const renderWithChakra = (ui: React.ReactElement) => {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('ConnectionStatus', () => {
  const mockedUseWebRTC = vi.mocked(useWebRTC)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows disconnected status by default', () => {
    renderWithChakra(<ConnectionStatus />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('shows connecting status', () => {
    mockedUseWebRTC.mockReturnValue({
      socket: null,
      isConnected: false,
      currentRoom: null,
      participants: [],
      connectionStatus: 'connecting',
      error: null,
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
    })
    renderWithChakra(<ConnectionStatus />)
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  it('shows connected status', () => {
    mockedUseWebRTC.mockReturnValue({
      socket: null,
      isConnected: true,
      currentRoom: null,
      participants: [],
      connectionStatus: 'connected',
      error: null,
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
    })
    renderWithChakra(<ConnectionStatus />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows error message when error exists', () => {
    const errorMessage = 'Connection failed'
    mockedUseWebRTC.mockReturnValue({
      socket: null,
      isConnected: false,
      currentRoom: null,
      participants: [],
      connectionStatus: 'error',
      error: errorMessage,
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
    })
    renderWithChakra(<ConnectionStatus />)
    expect(screen.getByText('Connection Error')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows room info when in a room', () => {
    const roomId = 'test-room-123'
    mockedUseWebRTC.mockReturnValue({
      socket: null,
      isConnected: true,
      currentRoom: roomId,
      participants: [{ id: 'user1', joinedAt: new Date() }],
      connectionStatus: 'connected',
      error: null,
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
    })
    renderWithChakra(<ConnectionStatus />)
    expect(screen.getByText(/Room ID:/)).toBeInTheDocument()
    expect(screen.getByText(roomId)).toBeInTheDocument()
    expect(screen.getByText(/Participants: 2/)).toBeInTheDocument()
  })
})