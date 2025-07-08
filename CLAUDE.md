# Vibe Monorepo - WebRTC Video Chat Application

## Project Overview
Vibe is a modern WebRTC video chat application built with a microservices architecture using pnpm workspaces. It features real-time video/audio communication, HTTP/3 support, and comprehensive development tooling.

## Project Structure
- **Root**: pnpm managed monorepo with workspace configuration
- **Workspace packages**: Defined in `pnpm-workspace.yaml` as `apps/*` and `packages/*`
- **Current packages**:
  - `apps/signaling`: Express.js WebSocket signaling server
  - `apps/web`: Next.js web application
  - `packages/`: Reserved for future shared libraries

## Key Technologies
### Web App (apps/web)
- **Runtime**: Next.js 15.3, React 19.1, Chakra UI 3.22, Socket.io-client 4.8
- **Development**: TypeScript 5.8, Vitest 3.2, ESLint 9.30
- **Features**: Server Components, Turbopack, WebRTC peer connections

### Signaling Service (apps/signaling)
- **Runtime**: Express 5.1, Socket.io 4.8, cors 2.8, dotenv 17.1, uuid 11.1
- **Development**: TypeScript 5.8, Vitest 3.2, ESLint 9.30, tsx 4.20
- **Features**: WebSocket signaling, REST API, Swagger documentation

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
pnpm lint         # Lint all packages
pnpm typecheck    # Type check all packages

# Documentation
pnpm build:docs   # Generate API documentation

# Docker
pnpm docker:up    # Start Docker services
pnpm docker:down  # Stop Docker services
pnpm docker:logs  # View Docker logs
```

## Dependency Management
```bash
# Update all dependencies to latest versions
pnpm update -r --latest

# Update specific workspace
pnpm update --latest --filter=signaling
pnpm update --latest --filter=web

# Install dependencies
pnpm install
```

## Docker & Infrastructure
- **Multi-container setup** with Docker Compose
- **Caddy reverse proxy** with HTTP/3 (QUIC) support
- **TLS termination** with local certificates (mkcert)
- **Health checks** and monitoring endpoints
- **Security headers** (HSTS, CSP, etc.)

## HTTPS/TLS Configuration
- **Local certificates** in `/certs` directory
- **Supported domains**: localhost, vibe.local
- **Certificate generation**: Using mkcert
- **HTTPS validation**: `pnpm check:https`
- **HTTP/2 & HTTP/3** support

## API Documentation
- **OpenAPI 3.0** specification
- **Swagger UI** at `/api-docs`
- **REST endpoints**:
  - `GET /health` - Health check
  - `POST /api/rooms` - Create room
  - `GET /api/rooms/:roomId` - Get room info
- **WebSocket events** documentation included

## Testing Setup
- **Framework**: Vitest for both apps
- **React testing**: Testing Library with jsdom
- **Test commands**:
  - `pnpm test` - Run tests once
  - `pnpm test:watch` - Watch mode
  - `pnpm test:ui` - Vitest UI
- **Coverage requirements**: 80% minimum, 90% for critical paths

## Architecture Highlights
1. **WebRTC signaling** via Socket.io
2. **Peer-to-peer connections** for video/audio
3. **Room-based communication** model
4. **Scalable architecture** with Redis support planned
5. **Modern React 19** with Server Components
6. **Express 5** for improved performance
7. **HTTP/3 support** via Caddy proxy

## Version Requirements
- **Node.js**: >=24.0.0
- **pnpm**: 10.12.4 (specified in root package.json)
- **Semver strategy**: ^major.minor (no patch versions)

## Project Documentation
- `/docs/ARCHITECTURE.md` - System design and data flow
- `/docs/CODING_STANDARDS.md` - Code style guidelines
- `/docs/TESTING_STANDARDS.md` - Testing best practices
- `/docs/DOCKER_HTTP3.md` - Docker and HTTP/3 setup
- `/docs/CONTRIBUTING.md` - Contribution guidelines

## Future Enhancements
- STUN/TURN server integration
- Media server for large groups
- Redis for horizontal scaling
- Monitoring and analytics
- E2E testing with Playwright
- CI/CD pipeline setup