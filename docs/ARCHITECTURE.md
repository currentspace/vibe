# Architecture Documentation

## Overview

Vibe is a modern web application built with a microservices architecture, designed to support real-time WebRTC communication. The project follows a monorepo structure using pnpm workspaces, enabling efficient code sharing and dependency management.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│   Web Client    │────▶│ Signaling Server │────▶│  STUN/TURN     │
│   (Next.js)     │◀────│  (Express/WS)    │     │   (Future)      │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                 │
         │                                                 │
         └────────────── WebRTC P2P Connection ───────────┘
```

### Component Architecture

#### 1. Web Application (`apps/web`)

**Technology Stack:**
- Next.js 15.3.3 with App Router
- React 19.1.0 with Server Components
- TypeScript 5.x
- Chakra UI v3 for component library
- Socket.io-client for WebRTC signaling

**Key Features:**
- Server-side rendering with React Server Components
- Client-side hydration with Turbopack
- Real-time WebRTC communication
- Responsive UI with Chakra UI

**Directory Structure:**
```
apps/web/
├── src/
│   ├── app/              # App router pages
│   │   ├── layout.tsx    # Root layout with providers
│   │   ├── page.tsx      # Home page
│   │   └── demo/         # Demo page
│   ├── components/       # Reusable components
│   │   ├── Button.tsx    # UI components
│   │   └── UserCard.tsx  # Server components
│   └── providers.tsx     # Client-side providers
└── public/               # Static assets
```

#### 2. Signaling Server (`apps/signaling`)

**Technology Stack:**
- Express 4.x
- Socket.io 4.x for WebSocket communication
- TypeScript 5.x
- UUID for room generation

**Key Features:**
- REST API for room management
- WebSocket support for real-time signaling
- Room-based peer connection management
- CORS configuration for cross-origin requests

**API Endpoints:**
- `GET /health` - Service health check
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomId` - Get room information

**WebSocket Events:**
- `join-room` - Join a signaling room
- `leave-room` - Leave a signaling room
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `ice-candidate` - Exchange ICE candidates

### Data Flow

#### WebRTC Connection Establishment

1. **Room Creation**
   ```
   Client → POST /api/rooms → Signaling Server
   Server → { roomId: "uuid" } → Client
   ```

2. **Peer Connection**
   ```
   Client A → join-room → Signaling Server
   Client B → join-room → Signaling Server
   Server → user-joined → All Clients
   ```

3. **Signaling Exchange**
   ```
   Client A → offer → Server → Client B
   Client B → answer → Server → Client A
   Both → ice-candidate → Server → Other
   ```

### State Management

#### Client State
- React Context for global app state
- Local component state for UI interactions
- WebRTC peer connection state management

#### Server State
- In-memory room storage (Map)
- Socket.io connection management
- No persistent storage (stateless design)

### Security Considerations

1. **CORS Configuration**
   - Restricted to localhost origins in development
   - Environment-based configuration for production

2. **Input Validation**
   - UUID validation for room IDs
   - Sanitization of user inputs

3. **Transport Security**
   - HTTPS enforcement in production
   - Secure WebSocket connections (WSS)

### Scalability Considerations

#### Horizontal Scaling
- Stateless signaling server design
- Redis adapter for Socket.io (future)
- Load balancer compatibility

#### Performance Optimizations
- Turbopack for faster development builds
- React Server Components for reduced client bundle
- Efficient WebSocket message routing

### Future Architecture Enhancements

1. **STUN/TURN Integration**
   - Coturn server deployment
   - NAT traversal support
   - Relay server fallback

2. **Media Server (Optional)**
   - Recording capabilities
   - Multi-party conference support
   - Stream processing

3. **Persistent Storage**
   - PostgreSQL for user data
   - Redis for session management
   - S3 for media storage

4. **Monitoring & Observability**
   - Prometheus metrics
   - ELK stack for logging
   - Distributed tracing

### Development Patterns

#### Separation of Concerns
- Presentation layer (React components)
- Business logic (Server actions/API routes)
- Data layer (Future database integration)

#### Code Reusability
- Shared TypeScript types (future packages/)
- Common utilities and helpers
- Consistent error handling

#### Testing Strategy
- Unit tests for business logic
- Integration tests for APIs
- E2E tests for critical user flows

### Deployment Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   CDN/Vercel    │     │  Cloud Provider  │
│   (Web App)     │     │ (Signaling API)  │
└─────────────────┘     └──────────────────┘
         │                        │
         └────────────────────────┘
                     │
              ┌──────────────┐
              │ Load Balancer│
              └──────────────┘
```

### Technology Decisions Rationale

1. **Next.js + React 19**
   - Server Components for better performance
   - Built-in optimization features
   - Excellent developer experience

2. **pnpm Monorepo**
   - Efficient disk space usage
   - Better dependency management
   - Fast installation times

3. **TypeScript**
   - Type safety across the stack
   - Better IDE support
   - Reduced runtime errors

4. **Socket.io**
   - Reliable WebSocket fallbacks
   - Room-based communication
   - Extensive ecosystem