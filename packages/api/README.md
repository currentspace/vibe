# @vibe/api

API client and server utilities for the Vibe video chat application.

## Overview

This package provides the SignalingClient for WebSocket communication and server-side utilities for the signaling server. It builds on top of `@vibe/core` types and utilities.

## Installation

```bash
pnpm add @vibe/api
```

## Features

### Client

- **SignalingClient**: WebSocket client with event emitter
- **Auto-reconnection**: Configurable reconnection logic
- **Type-safe events**: Full TypeScript support for events
- **Promise-based API**: Modern async/await interface

### Server

- **Route handlers**: REST API endpoints
- **Middleware**: CORS, error handling
- **Types**: Shared request/response types

## Usage

### SignalingClient

```typescript
import { SignalingClient } from '@vibe/api'

// Create client instance
const client = new SignalingClient({
  url: 'ws://localhost:3005',
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5
})

// Connect to server
await client.connect()

// Listen for events
client.on('connected', () => {
  console.log('Connected to signaling server')
})

client.on('room-joined', ({ roomId, userId, participants }) => {
  console.log(`Joined room ${roomId} as ${userId}`)
  console.log(`Participants:`, participants)
})

client.on('user-joined', ({ userId }) => {
  console.log(`User ${userId} joined the room`)
})

client.on('offer', async ({ userId, offer }) => {
  console.log(`Received offer from ${userId}`)
  // Handle WebRTC offer
})

// Send commands
const roomId = await client.createRoom()
await client.joinRoom(roomId)
await client.sendOffer(targetUserId, offer)
await client.sendAnswer(targetUserId, answer)
await client.sendIceCandidate(targetUserId, candidate)

// Disconnect
client.disconnect()
```

### Event Types

```typescript
interface SignalingEvents {
  // Connection events
  connected: () => void
  disconnected: () => void
  error: (error: Error) => void
  
  // Room events
  'room-joined': (data: {
    roomId: string
    userId: string
    participants: Participant[]
  }) => void
  'room-left': () => void
  'room-error': (error: string) => void
  
  // User events
  'user-joined': (data: { userId: string }) => void
  'user-left': (data: { userId: string }) => void
  
  // WebRTC events
  offer: (data: { userId: string; offer: RTCSessionDescriptionInit }) => void
  answer: (data: { userId: string; answer: RTCSessionDescriptionInit }) => void
  'ice-candidate': (data: { userId: string; candidate: RTCIceCandidateInit }) => void
}
```

### Server Utilities

```typescript
import { createRoomHandler, getRoomHandler } from '@vibe/api/server'
import express from 'express'

const app = express()

// Use provided handlers
app.post('/api/rooms', createRoomHandler)
app.get('/api/rooms/:roomId', getRoomHandler)
```

## API Reference

### SignalingClient

#### Constructor Options

- `url` (string): WebSocket server URL
- `autoReconnect` (boolean): Enable auto-reconnection
- `reconnectInterval` (number): Milliseconds between reconnection attempts
- `maxReconnectAttempts` (number): Maximum reconnection attempts

#### Methods

- `connect(): Promise<void>` - Connect to server
- `disconnect(): void` - Disconnect from server
- `createRoom(): Promise<string>` - Create a new room
- `joinRoom(roomId: string): void` - Join a room
- `leaveRoom(): void` - Leave current room
- `sendOffer(userId: string, offer: RTCSessionDescriptionInit): void` - Send WebRTC offer
- `sendAnswer(userId: string, answer: RTCSessionDescriptionInit): void` - Send WebRTC answer
- `sendIceCandidate(userId: string, candidate: RTCIceCandidateInit): void` - Send ICE candidate

#### Properties

- `isConnected: boolean` - Connection status
- `currentRoom: string | null` - Current room ID
- `userId: string | null` - Current user ID

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT