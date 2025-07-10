# Vibe - WebRTC Video Chat Monorepo

A modern WebRTC video chat application built with a microservices architecture using pnpm workspaces. Features real-time video/audio communication, HTTP/3 support, and a modular package structure.

## 🏗️ Architecture

This project uses a monorepo structure managed by pnpm workspaces:

```
vibe/
├── apps/                    # End-user applications
│   ├── web/                # Next.js web application
│   └── signaling/          # Express.js signaling server
├── packages/               # Shared packages and libraries
│   ├── core/              # Core business logic and types
│   ├── api/               # API client and server utilities
│   ├── components/        # Shared React components (web)
│   ├── components-native/ # Shared React Native components (planned)
│   ├── mobile/            # React Native client package (planned)
│   └── shaders/           # Shared shader code (planned)
└── docs/                  # Documentation
```

## 📦 Packages

### Applications

- **`apps/web`** - Next.js 15 web application with React 19, Chakra UI, and WebRTC peer connections
- **`apps/signaling`** - Express.js 5 WebSocket signaling server with Socket.io

### Libraries

- **`packages/core`** - Core types, utilities, and business logic shared across packages
- **`packages/api`** - API client (SignalingClient) and server utilities
- **`packages/components`** - Reusable React components for web (WebRTCContext, UI components, hooks)
- **`packages/components-native`** - React Native components and hooks (planned)
- **`packages/mobile`** - React Native client package with native WebRTC (planned)
- **`packages/shaders`** - Shared shader code for web and native (planned)

## 🚀 Quick Start

### Prerequisites

- Node.js >=24.0.0
- pnpm 10.12.4
- [mkcert](https://github.com/FiloSottile/mkcert) (for HTTPS setup)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd vibe

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### HTTPS Setup (Required for WebRTC)

WebRTC requires secure contexts (HTTPS) to access camera and microphone:

```bash
# Install mkcert (macOS)
brew install mkcert
brew install nss # if you use Firefox

# Install the local CA
mkcert -install

# Generate certificates
pnpm setup:https
```

### Development

```bash
# Run all services in development mode
pnpm dev

# Run with HTTPS enabled (recommended for WebRTC)
pnpm dev:https

# Run specific services
pnpm dev:web        # Web app only
pnpm dev:signaling  # Signaling server only

# Run with Docker (includes HTTP/3 support)
pnpm dev:docker
```

## 🛠️ Development Commands

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter=@vibe/core build
pnpm --filter=web build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Test specific package
pnpm --filter=web test
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

### Package Management

```bash
# Update all dependencies
pnpm update -r --latest

# Update specific workspace
pnpm update --latest --filter=web
pnpm update --latest --filter=@vibe/core

# Clean all build artifacts
pnpm clean
```

## 🐳 Docker Support

The project includes Docker support with HTTP/3 (QUIC) via Caddy:

```bash
# Start services
pnpm docker:up

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

### Docker Architecture

- **Caddy** - Reverse proxy with HTTP/3 support
- **Web** - Next.js application container
- **Signaling** - Express.js signaling server
- **Network** - Isolated Docker network for services

## 🔒 HTTPS/TLS Configuration

Local development uses mkcert for SSL certificates:

- Certificates are stored in `/certs`
- Supports `localhost` and `vibe.local`
- HTTP/2 and HTTP/3 enabled via Caddy proxy
- Automatic HTTPS redirect in production

## 📡 API Documentation

### REST Endpoints

The signaling server provides OpenAPI documentation at `http://localhost:3005/api-docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/rooms` | Create a new room |
| GET | `/api/rooms/:roomId` | Get room information |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join a room |
| `leave-room` | Client → Server | Leave a room |
| `offer` | Client ↔ Server | WebRTC offer |
| `answer` | Client ↔ Server | WebRTC answer |
| `ice-candidate` | Client ↔ Server | ICE candidate exchange |
| `user-joined` | Server → Client | User joined notification |
| `user-left` | Server → Client | User left notification |

## 🎯 Features

- **Real-time Video Chat** - Peer-to-peer video communication using WebRTC
- **Room-based Sessions** - Create and join private rooms for video calls
- **Modern React** - React 19 with Server Components and concurrent features
- **Type Safety** - Full TypeScript coverage with strict mode
- **Modular Architecture** - Clean separation of concerns with shared packages
- **HTTP/3 Support** - Next-generation protocol support via Caddy
- **Comprehensive Testing** - Unit tests with Vitest, component tests with Testing Library
- **Developer Experience** - Hot reloading, TypeScript, ESLint, and Prettier

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [Contributing](docs/CONTRIBUTING.md) - Development guidelines
- [Docker & HTTP/3](docs/DOCKER_HTTP3.md) - Container setup
- [Coding Standards](docs/CODING_STANDARDS.md) - Code style guide
- [Testing Standards](docs/TESTING_STANDARDS.md) - Testing practices

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.3** - React framework with App Router
- **React 19.1** - Latest React with Server Components
- **Chakra UI 3.22** - Component library
- **TypeScript 5.8** - Type safety
- **Socket.io Client** - WebSocket communication
- **WebRTC** - Peer-to-peer video/audio

### Backend
- **Express.js 5.1** - Web framework
- **Socket.io 4.8** - Real-time bidirectional communication
- **TypeScript 5.8** - Type safety
- **Swagger/OpenAPI** - API documentation

### Shared Packages
- **@vibe/core** - Business logic, types, utilities
- **@vibe/api** - API client and server utilities
- **@vibe/components** - React components and hooks (web)
- **@vibe/components-native** - React Native components (planned)
- **@vibe/mobile** - React Native client package (planned)
- **@vibe/shaders** - Shared shader code (planned)

### Infrastructure
- **pnpm** - Fast, disk space efficient package manager
- **Turborepo** - High-performance build system (planned)
- **Docker Compose** - Container orchestration
- **Caddy** - Modern web server with HTTP/3
- **Vitest** - Fast unit test framework
- **ESLint 9** - Code linting
- **tsup** - TypeScript bundler for packages

## 🚀 Deployment

### Environment Variables

Create `.env` files for each application:

**apps/web/.env:**
```env
NEXT_PUBLIC_SIGNALING_URL=https://your-signaling-server.com
```

**apps/signaling/.env:**
```env
PORT=3005
NODE_ENV=production
CLIENT_URL=https://your-web-app.com
```

### Production Build

```bash
# Build all packages
pnpm build

# Start production servers
cd apps/web && pnpm start
cd apps/signaling && pnpm start
```

## 🤝 Contributing

Please read our [Contributing Guide](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.