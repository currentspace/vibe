# @vibe/components

Reusable React components and hooks for WebRTC video chat applications.

## Overview

This package provides a complete set of React components, contexts, and hooks for building WebRTC-based video chat interfaces. It includes WebRTC state management, media controls, and UI components.

## Installation

```bash
pnpm add @vibe/components
```

## Features

### WebRTC Context

- Complete WebRTC state management
- Signaling server integration
- Peer connection management
- Media stream handling

### Hooks

- `useMediaStream` - Camera and microphone management
- `useRoomConnection` - Room connection management
- `useWebRTC` - Access WebRTC context

### UI Components

- `VideoPlayer` - Video stream display
- `MediaControls` - Audio/video toggle controls
- `ParticipantList` - Room participant display
- `ConnectionStatus` - Connection state indicator

## Usage

### WebRTC Provider

Wrap your application with the WebRTC provider:

```tsx
import { WebRTCProvider } from '@vibe/components'

function App() {
  return (
    <WebRTCProvider 
      signalingUrl="ws://localhost:3005"
      iceServers={[{ urls: 'stun:stun.l.google.com:19302' }]}
    >
      <YourApp />
    </WebRTCProvider>
  )
}
```

### Using WebRTC Context

```tsx
import { useWebRTC } from '@vibe/components'

function VideoChat() {
  const {
    connectionState,
    isConnected,
    currentRoom,
    participants,
    localStream,
    remoteStreams,
    connect,
    createRoom,
    joinRoom,
    startLocalStream,
    toggleAudio,
    toggleVideo
  } = useWebRTC()

  useEffect(() => {
    // Connect to signaling server
    connect()
    
    // Start local media
    startLocalStream()
  }, [])

  const handleCreateRoom = async () => {
    const roomId = await createRoom()
    console.log('Created room:', roomId)
  }

  return (
    <div>
      <button onClick={handleCreateRoom}>Create Room</button>
      <button onClick={() => toggleAudio()}>Toggle Audio</button>
      <button onClick={() => toggleVideo()}>Toggle Video</button>
    </div>
  )
}
```

### Media Stream Hook

```tsx
import { useMediaStream } from '@vibe/components'

function MediaSetup() {
  const {
    stream,
    isLoading,
    error,
    audioEnabled,
    videoEnabled,
    startStream,
    stopStream,
    toggleAudio,
    toggleVideo
  } = useMediaStream({
    audio: true,
    video: { width: 1280, height: 720 },
    autoStart: true
  })

  if (isLoading) return <div>Starting camera...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <video
        ref={el => el && stream && (el.srcObject = stream)}
        autoPlay
        muted
      />
      <button onClick={() => toggleAudio()}>
        {audioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={() => toggleVideo()}>
        {videoEnabled ? 'Hide Video' : 'Show Video'}
      </button>
    </div>
  )
}
```

### Room Connection Hook

```tsx
import { useRoomConnection } from '@vibe/components'

function RoomManager() {
  const {
    isConnected,
    currentRoom,
    participants,
    isJoining,
    isCreating,
    createAndJoinRoom,
    joinRoom,
    leaveRoom
  } = useRoomConnection({
    autoConnect: true,
    signalingUrl: 'ws://localhost:3005'
  })

  const handleJoinRoom = async (roomId: string) => {
    try {
      await joinRoom(roomId)
      console.log('Joined room:', roomId)
    } catch (error) {
      console.error('Failed to join room:', error)
    }
  }

  return (
    <div>
      {currentRoom ? (
        <>
          <p>Room: {currentRoom}</p>
          <p>Participants: {participants.length}</p>
          <button onClick={leaveRoom}>Leave Room</button>
        </>
      ) : (
        <button onClick={createAndJoinRoom} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Room'}
        </button>
      )}
    </div>
  )
}
```

### UI Components

#### VideoPlayer

```tsx
import { VideoPlayer } from '@vibe/components'

<VideoPlayer
  stream={localStream}
  muted
  mirrored
  label="You"
  className="rounded-lg shadow-lg"
/>

<VideoPlayer
  stream={remoteStreams.get(userId)}
  label={participant.name}
/>
```

#### MediaControls

```tsx
import { MediaControls } from '@vibe/components'

<MediaControls
  audioEnabled={audioEnabled}
  videoEnabled={videoEnabled}
  onToggleAudio={() => toggleAudio()}
  onToggleVideo={() => toggleVideo()}
  onLeave={() => leaveRoom()}
  showLeaveButton
  className="flex gap-2"
/>
```

#### ParticipantList

```tsx
import { ParticipantList } from '@vibe/components'

<ParticipantList
  participants={participants}
  localUserId={localUserId}
  className="bg-white rounded-lg p-4"
/>
```

#### ConnectionStatus

```tsx
import { ConnectionStatus } from '@vibe/components'

<ConnectionStatus
  state={connectionState}
  error={error}
  className="text-sm"
/>
```

## API Reference

### WebRTCProvider Props

- `signalingUrl?: string` - WebSocket server URL
- `iceServers?: RTCIceServer[]` - ICE server configuration
- `mediaConstraints?: MediaStreamConstraints` - Default media constraints

### useMediaStream Options

- `audio?: boolean | MediaTrackConstraints` - Audio configuration
- `video?: boolean | MediaTrackConstraints` - Video configuration
- `constraints?: MediaStreamConstraints` - Full constraints object
- `autoStart?: boolean` - Start stream on mount

### useRoomConnection Options

- `autoConnect?: boolean` - Connect on mount
- `signalingUrl?: string` - Override signaling URL

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