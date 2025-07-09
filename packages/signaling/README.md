# Vibe Signaling Server

Express.js-based WebRTC signaling server with Socket.io for real-time communication.

## Overview

This is the signaling server for the Vibe video chat application. It handles WebRTC signaling, room management, and peer connection coordination using Socket.io for WebSocket communication.

## Technology Stack

- **Express.js 5.1** - Web framework
- **Socket.io 4.8** - Real-time bidirectional communication
- **TypeScript 5.8** - Type safety
- **Swagger/OpenAPI** - API documentation
- **Vitest** - Testing framework

## Features

- WebSocket-based signaling for WebRTC
- Room-based connection management
- RESTful API for room operations
- OpenAPI documentation with Swagger UI
- HTTPS/HTTP2 support
- CORS configuration
- Health monitoring endpoints

## Project Structure

```
src/
├── index.ts              # Server entry point
├── api-docs.ts          # OpenAPI specification
├── https-config.ts      # TLS configuration
├── core/                # Core business logic
│   └── SignalingCore.ts # Signaling implementation
├── adapters/            # Platform adapters
│   ├── MemoryStorageAdapter.ts   # In-memory storage
│   ├── SocketIOAdapter.ts        # Socket.io adapter
│   └── WebSocketAdapter.ts       # WebSocket adapter
└── __tests__/           # Test files
    └── signaling.test.ts # Integration tests
```

## API Documentation

### REST Endpoints

Access Swagger UI at `http://localhost:3005/api-docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| POST | `/api/rooms` | Create a new room |
| GET | `/api/rooms/:roomId` | Get room information |

### WebSocket Events

#### Client → Server

```typescript
// Join a room
socket.emit('join-room', { roomId: string, userId?: string })

// Leave a room
socket.emit('leave-room')

// Send WebRTC offer
socket.emit('offer', { targetUserId: string, offer: RTCSessionDescriptionInit })

// Send WebRTC answer
socket.emit('answer', { targetUserId: string, answer: RTCSessionDescriptionInit })

// Send ICE candidate
socket.emit('ice-candidate', { targetUserId: string, candidate: RTCIceCandidateInit })
```

#### Server → Client

```typescript
// Room joined successfully
socket.on('room-joined', { roomId: string, userId: string, participants: Participant[] })

// User joined the room
socket.on('user-joined', { userId: string })

// User left the room
socket.on('user-left', { userId: string })

// Receive WebRTC offer
socket.on('offer', { userId: string, offer: RTCSessionDescriptionInit })

// Receive WebRTC answer
socket.on('answer', { userId: string, answer: RTCSessionDescriptionInit })

// Receive ICE candidate
socket.on('ice-candidate', { userId: string, candidate: RTCIceCandidateInit })

// Error occurred
socket.on('error', { message: string })
```

## Development

### Prerequisites

- Node.js >=24.0.0
- pnpm 10.12.4
- SSL certificates for HTTPS (optional)

### Environment Variables

Create `.env`:

```env
# Server Configuration
PORT=3005
NODE_ENV=development

# CORS Configuration
CLIENT_URL=http://localhost:3000

# HTTPS Configuration (optional)
USE_HTTPS=false
USE_HTTP2=true
CERT_PATH=../../certs/localhost.pem
KEY_PATH=../../certs/localhost-key.pem
```

### Running Locally

```bash
# Install dependencies (from root)
pnpm install

# Run development server
pnpm dev:signaling

# Run with HTTPS
USE_HTTPS=true pnpm dev:signaling

# Build for production
pnpm --filter=signaling build

# Start production server
pnpm --filter=signaling start
```

### Available Scripts

- `dev` - Start development server with hot reload
- `build` - Compile TypeScript to JavaScript
- `start` - Start production server
- `test` - Run tests with Vitest
- `test:watch` - Run tests in watch mode
- `lint` - Run ESLint
- `typecheck` - Run TypeScript compiler

## Configuration

### CORS

Configure allowed origins in `.env`:

```env
CLIENT_URL=http://localhost:3000,https://yourdomain.com
```

### HTTPS/HTTP2

To enable HTTPS with HTTP/2:

1. Generate certificates (see root README)
2. Set environment variables:
   ```env
   USE_HTTPS=true
   USE_HTTP2=true
   CERT_PATH=path/to/cert.pem
   KEY_PATH=path/to/key.pem
   ```

### Room Limits

Configure in code:
- `MAX_ROOM_PARTICIPANTS` - Maximum users per room (default: 10)
- `ROOM_TIMEOUT` - Room cleanup timeout (default: 1 hour)

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test
pnpm test signaling.test.ts
```

Test categories:
- Unit tests for business logic
- Integration tests for Socket.io events
- API endpoint tests

## Deployment

### Docker

```bash
# Build image
docker build -f Dockerfile.dev -t vibe-signaling .

# Run container
docker run -p 3005:3005 vibe-signaling
```

### PM2

```bash
# Start with PM2
pm2 start dist/index.js --name vibe-signaling

# View logs
pm2 logs vibe-signaling
```

### Cloud Platforms

#### Heroku
```bash
heroku create vibe-signaling
heroku config:set CLIENT_URL=https://yourdomain.com
git push heroku main
```

#### Railway/Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

## Architecture

### Room Management

Rooms are managed in-memory with automatic cleanup:
- Rooms are created on demand
- Empty rooms are removed after timeout
- Participant limits are enforced

### Signaling Flow

1. Client A creates/joins room
2. Client B joins same room
3. Server notifies all participants
4. Clients exchange offers/answers via server
5. ICE candidates are relayed
6. P2P connection established

### Scalability

For horizontal scaling:
- Use Redis adapter for Socket.io
- Implement sticky sessions
- Use external storage for room state

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3005/health

# Detailed health info
curl http://localhost:3005/health?detailed=true
```

### Metrics

Monitor these key metrics:
- Active connections
- Room count
- Message throughput
- Connection errors

## Troubleshooting

### Connection Issues
- Check CORS configuration
- Verify WebSocket upgrade headers
- Test with `wscat` or similar tools

### Performance Issues
- Monitor room sizes
- Check for memory leaks
- Enable WebSocket compression

### HTTPS Issues
- Verify certificate paths
- Check certificate validity
- Test with `openssl s_client`

## Security

- Input validation on all messages
- Rate limiting (planned)
- Room ID validation
- CORS restrictions
- TLS encryption for production

## License

MIT