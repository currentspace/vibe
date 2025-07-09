# @vibe/core

Core business logic, types, and utilities for the Vibe video chat application.

## Overview

This package provides the foundational types, utilities, and business logic used throughout the Vibe monorepo. It has zero external dependencies and serves as the base for all other packages.

## Installation

```bash
pnpm add @vibe/core
```

## Features

### Types

- **WebRTC Types**: `Participant`, `Room`, `SignalingMessage`
- **Connection Types**: `ConnectionState`, `ConnectionError`
- **API Types**: Request/response interfaces

### Utilities

- **ID Generation**: Unique room and user ID generation
- **Validation**: Input validation and sanitization
- **Error Handling**: Standardized error codes and messages

### Classes

- **ConnectionStateManager**: WebRTC connection state machine
- **RoomManager**: Room creation and participant management
- **SignalingCore**: Core signaling logic
- **MediaConstraintsBuilder**: Fluent API for media constraints

## Usage

### Types

```typescript
import { Participant, Room, ConnectionState } from '@vibe/core'

const participant: Participant = {
  id: 'user-123',
  connectionId: 'conn-456',
  joinedAt: new Date()
}

const room: Room = {
  id: 'room-789',
  createdAt: new Date(),
  participants: new Map([[participant.id, participant]])
}
```

### Utilities

```typescript
import { generateRoomId, generateUserId, isValidRoomId } from '@vibe/core'

const roomId = generateRoomId() // 'room-1234567890123-abc123xyz'
const userId = generateUserId() // 'user-1234567890123-def456uvw'

if (isValidRoomId(roomId)) {
  // Valid room ID
}
```

### Connection State Management

```typescript
import { ConnectionStateManager, ConnectionState } from '@vibe/core'

const manager = new ConnectionStateManager()

// Subscribe to state changes
manager.on('stateChange', (state, prevState) => {
  console.log(`State changed from ${prevState} to ${state}`)
})

// Update state
manager.setState(ConnectionState.CONNECTING)
```

### Media Constraints

```typescript
import { MediaConstraintsBuilder } from '@vibe/core'

const constraints = new MediaConstraintsBuilder()
  .setVideo({
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  })
  .setAudio({
    echoCancellation: true,
    noiseSuppression: true
  })
  .build()
```

## API Reference

### Constants

- `MAX_ROOM_PARTICIPANTS` - Maximum participants per room (default: 10)
- `ROOM_ID_LENGTH` - Length of room ID (default: 27)
- `USER_ID_LENGTH` - Length of user ID (default: 27)

### Error Codes

- `ROOM_NOT_FOUND` - Room does not exist
- `ROOM_FULL` - Room has reached capacity
- `INVALID_MESSAGE` - Invalid signaling message
- `CONNECTION_FAILED` - WebRTC connection failed

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