# Vibe Monorepo - WebRTC Video Chat Application

## 🚨 CRITICAL RULES - ALWAYS FOLLOW

1. **ALWAYS use `pnpm`** - NEVER use `npx` or `npm`
2. **ALWAYS run quality checks** before completing tasks:
   ```bash
   pnpm build        # Build all packages
   pnpm typecheck    # Check TypeScript types
   pnpm lint         # Run ESLint
   pnpm test         # Run tests
   ```
3. **ALWAYS use workspace protocol** for internal dependencies: `"@vibe/core": "workspace:*"`
4. **NEVER commit without running**: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
5. **Package Organization**:
   - `packages/` - ALL shared code, libraries, and reusable modules (including mobile clients)
   - `apps/` - ONLY end-user applications
6. **ALWAYS use latest versions** when adding dependencies - check npm/pnpm for the most recent stable versions

## Project Overview

Vibe is a modern WebRTC video chat application built with a microservices architecture using pnpm workspaces. It features real-time video/audio communication, HTTP/3 support, and comprehensive development tooling.

## Project Structure

```
vibe/
├── apps/                    # End-user applications ONLY
│   ├── web/                # Next.js 15 web application
│   └── signaling/          # Express.js 5 signaling server
├── packages/               # ALL shared code and libraries
│   ├── core/              # Core business logic and types
│   ├── api/               # API client and server utilities
│   ├── components/        # Shared React components (web)
│   ├── components-native/ # Shared React Native components (planned)
│   ├── mobile/            # React Native client package (planned)
│   └── shaders/           # Shared shader code (planned)
├── docs/                  # Documentation
├── certs/                 # SSL certificates (gitignored)
└── pnpm-workspace.yaml    # Workspace configuration
```

## Package Architecture

### @vibe/core (Zero Dependencies)

- **Purpose**: Shared business logic, types, and utilities
- **Key Exports**:
  - Types: `Participant`, `Room`, `SignalingMessage`, `ConnectionState`
  - Utilities: ID generation, validation, error handling
  - Classes: `ConnectionStateManager`, `RoomManager`, `SignalingCore`
  - Constants: Error codes, limits, configuration
- **Architecture**: Pure functions, immutable data, platform-agnostic

### @vibe/api

- **Purpose**: Client-server communication layer
- **Key Components**:
  - `SignalingClient`: Event-driven WebSocket client with auto-reconnect
  - Server utilities: REST handlers, middleware
  - Event protocol: join-room, leave-room, offer, answer, ice-candidate
- **Dependencies**: `@vibe/core` only

### @vibe/components

- **Purpose**: Reusable React components and hooks
- **Key Exports**:
  - Context: `WebRTCProvider`, `useWebRTC`
  - Hooks: `useMediaStream`, `useRoomConnection`
  - UI: `VideoPlayer`, `MediaControls`, `ParticipantList`, `ConnectionStatus`
- **Guidelines**: Function components, TypeScript interfaces, className support
- **Dependencies**: `@vibe/core`, `@vibe/api`

### apps/web

- **Stack**: Next.js 15.3, React 19.1, Chakra UI 3.22
- **Features**: Server Components, WebRTC peer connections, WebGL demos
- **Structure**:
  ```
  src/
  ├── app/           # App Router pages
  ├── components/    # App-specific components
  ├── contexts/      # Legacy (migrating to @vibe/components)
  └── lib/          # Utilities
  ```
- **Patterns**: Server Components by default, 'use client' only when needed

### apps/signaling

- **Stack**: Express 5.1, Socket.io 4.8, TypeScript
- **Features**: WebSocket signaling, REST API, Swagger docs
- **Endpoints**:
  - `GET /health` - Health check
  - `POST /api/rooms` - Create room
  - `GET /api/rooms/:roomId` - Get room info
  - `GET /api-docs` - Swagger UI

## Development Commands

```bash
# Development
pnpm dev          # Run web and signaling in parallel
pnpm dev:https    # Run with HTTPS enabled
pnpm dev:docker   # Run in Docker environment
pnpm dev:web      # Run only web app
pnpm dev:signaling # Run only signaling server

# Building & Testing
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm test:watch   # Run tests in watch mode
pnpm test:ui      # Run tests with Vitest UI
pnpm lint         # Lint all packages
pnpm typecheck    # Type check all packages

# Package-specific commands
pnpm --filter=@vibe/core build
pnpm --filter=web test
pnpm --filter=signaling lint

# Dependency Management
pnpm update -r --latest              # Update all
pnpm update --latest --filter=web    # Update specific
pnpm add <pkg> --filter=@vibe/core  # Add to package
```

## Code Style & Patterns

### TypeScript

- Strict mode enabled
- Prefer interfaces over types for objects
- Meaningful variable names
- Document complex functions

### React Components

```tsx
// Function components only
export function MyComponent({ prop }: MyComponentProps) {
  return <div>{prop}</div>
}

// Always include interfaces
interface MyComponentProps {
  prop: string
  className?: string // Always support className
}
```

### Testing

- Vitest for all packages
- Co-locate test files: `Component.test.tsx`
- Mock WebRTC APIs
- Minimum 80% coverage

### Common Patterns

- Server Components by default in Next.js
- Event-driven architecture for real-time features
- Immutable state updates
- Error boundaries for resilience

## WebRTC Implementation

- **Signaling**: Socket.io with room-based routing
- **State Management**: WebRTCContext in @vibe/components
- **Media Handling**: useMediaStream hook
- **Connection Management**: useRoomConnection hook
- **Peer Connections**: Managed in WebRTCContext with automatic cleanup

## Environment Variables

### apps/web

- `NEXT_PUBLIC_SIGNALING_URL` - WebSocket server URL (default: http://localhost:3005)

### apps/signaling

- `PORT` - Server port (default: 3005)
- `NODE_ENV` - Environment (development/production)
- `CLIENT_URL` - Allowed CORS origin (default: http://localhost:3000)
- `USE_HTTP2` - Enable HTTP/2 support (default: true)

## Common Tasks

### Adding a new shared package

1. Create directory under `packages/`
2. Initialize with `pnpm init`
3. Configure TypeScript and build tools (tsup)
4. Export from package index
5. Add to dependent packages

### Adding React Native support

1. Create `packages/mobile` for the React Native client package
2. Create `packages/components-native` for native UI components
3. Create `packages/shaders` for shared shader code
4. Use workspace protocol to share `@vibe/core` and `@vibe/api`
5. Configure Metro bundler to work with pnpm workspaces

### Updating shared types

1. Modify types in `packages/core/src/types/`
2. Build core: `pnpm --filter=@vibe/core build`
3. TypeScript will catch breaking changes

### Adding new components

1. Add to `packages/components/src/ui/`
2. Export from index files
3. Include TypeScript interfaces
4. Support className prop
5. Handle loading/error states

## Architecture Principles

1. **Dependency Direction**: Apps → Packages → Core (never reverse)
2. **Zero Dependencies**: @vibe/core has no external dependencies
3. **Type Safety**: Shared types in @vibe/core ensure consistency
4. **Modularity**: Each package has a single responsibility
5. **Testability**: Pure functions, dependency injection

## Performance Considerations

- React Server Components for reduced client bundle
- Dynamic imports for code splitting
- Turbopack for fast development
- Tree shaking in production builds
- Efficient re-renders with proper React patterns

## Security Best Practices

- Input validation on all user inputs
- CORS properly configured
- Environment variables for sensitive data
- No secrets in code
- TLS/HTTPS in production

## Troubleshooting

### Build Errors

```bash
pnpm clean      # Clean all build artifacts
pnpm install    # Reinstall dependencies
pnpm build      # Rebuild all packages
```

### Type Errors

- Check imports from workspace packages
- Ensure packages are built
- Run `pnpm typecheck` to see all errors

### WebRTC Issues

- Ensure HTTPS is enabled for camera access
- Check browser permissions
- Verify signaling server is running
- Test STUN/TURN connectivity

## Future Enhancements

- STUN/TURN server integration for NAT traversal
- Media server (Mediasoup/Janus) for large groups
- Redis for signaling server horizontal scaling
- Monitoring with OpenTelemetry
- E2E testing with Playwright
- CI/CD pipeline with GitHub Actions
- Turborepo for faster builds
