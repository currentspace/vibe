# Vibe Signaling Server

A flexible WebRTC signaling server that can run on multiple platforms:
- **Node.js** with Socket.io (traditional deployment)
- **Cloudflare Workers** (simple in-memory version)
- **Cloudflare Durable Objects** (persistent rooms with global distribution)

## Architecture

```
src/
├── core/                 # Platform-agnostic business logic
│   ├── types.ts         # Core type definitions
│   └── SignalingCore.ts # Main signaling logic
├── adapters/            # Platform adapters
│   ├── MemoryStorageAdapter.ts   # In-memory storage
│   ├── SocketIOAdapter.ts        # Socket.io connections
│   └── WebSocketAdapter.ts       # Native WebSocket connections
├── workers/             # Cloudflare Workers implementations
│   ├── simple-worker.ts          # Basic worker (no persistence)
│   └── durable-objects.ts        # Durable Objects version
├── nodejs/              # Node.js implementation
│   └── server.ts        # Express + Socket.io server
└── scripts/             # Deployment and management scripts
```

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Run Node.js version (Socket.io)
pnpm dev:node

# Run Cloudflare Worker locally
pnpm dev:worker

# Run with Durable Objects locally
pnpm dev:durable
```

### Deployment

```bash
# Deploy to Cloudflare (Durable Objects)
pnpm deploy:durable

# Deploy simple worker (free tier)
pnpm deploy:simple

# Deploy to production
pnpm deploy:prod

# Build for Node.js deployment
pnpm build
```

## Platform Comparison

| Feature | Node.js | Simple Worker | Durable Objects |
|---------|---------|---------------|-----------------|
| **Persistence** | ❌ Memory only | ❌ Memory only | ✅ Persistent |
| **Scalability** | ⚠️ Single server | ⚠️ Single region | ✅ Global |
| **WebSockets** | Socket.io | Native | Native |
| **Cost** | VPS cost | Free tier | $5/mo + usage |
| **Setup** | Traditional | Easy | Easy |
| **State** | Lost on restart | Lost on restart | Preserved |

## API Endpoints

All implementations support the same REST API:

- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomId` - Get room information
- `GET /health` - Health check
- `WS /ws` or `/ws/:roomId` - WebSocket connection

## WebSocket Protocol

All implementations support the same message protocol:

```javascript
// Join room
{ type: "join-room", roomId: "...", userId: "..." }

// Leave room  
{ type: "leave-room", roomId: "...", userId: "..." }

// WebRTC signaling
{ type: "offer", targetUserId: "...", data: {...} }
{ type: "answer", targetUserId: "...", data: {...} }
{ type: "ice-candidate", targetUserId: "...", data: {...} }
```

## Management

```bash
# View logs
pnpm logs          # Development
pnpm logs:prod     # Production

# Run API tests
pnpm test:api

# Manage secrets (Cloudflare)
./scripts/manage.sh secrets TURN_SECRET

# View metrics
./scripts/manage.sh metrics
```

## Environment Variables

### Node.js
```env
PORT=4000
CORS_ORIGIN=*
USE_HTTPS=false
```

### Cloudflare Workers
```toml
[vars]
LOG_LEVEL = "info"
TURN_SECRET = "your-secret"  # Use wrangler secret put
```

## Migration Guide

### From Socket.io to Cloudflare

1. Update your client to use native WebSockets:
   ```javascript
   // Old (Socket.io)
   const socket = io('http://localhost:4000')
   
   // New (WebSocket)
   const ws = new WebSocket('wss://your-worker.workers.dev/ws')
   ```

2. Update message format:
   ```javascript
   // Old (Socket.io events)
   socket.emit('join-room', roomId, userId)
   
   // New (JSON messages)
   ws.send(JSON.stringify({ 
     type: 'join-room', 
     roomId, 
     userId 
   }))
   ```

## Testing

```bash
# Unit tests
pnpm test

# API tests (requires running server)
pnpm test:api

# Test locally with curl
curl -X POST http://localhost:8787/api/rooms
```

## Troubleshooting

### Durable Objects not working
- Ensure you're on a paid Cloudflare plan
- Check that migrations are applied: `wrangler migrations list`

### WebSocket connection fails
- Check CORS settings
- Ensure using `wss://` for secure connections
- Verify room exists before connecting

### High latency
- Use Durable Objects for geographic distribution
- Enable WebSocket compression in wrangler.toml
- Consider using Cloudflare's anycast network