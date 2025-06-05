# Vibe - Real-time WebRTC Video Chat Application

A modern, real-time video chat application built with React 19, Next.js 15, and WebRTC. Features a clean architecture with a monorepo structure and real-time signaling via Socket.io.

## 🚀 Features

- **Real-time Video Chat** - Peer-to-peer video communication using WebRTC
- **Room-based Sessions** - Create and join private rooms for video calls
- **Modern Tech Stack** - React 19 with Server Components, Next.js 15, TypeScript
- **Beautiful UI** - Chakra UI v3 with smooth animations
- **Monorepo Architecture** - Clean separation of concerns with pnpm workspaces
- **Type-safe** - Full TypeScript coverage across the entire stack
- **Well-tested** - Comprehensive test suite with Vitest
- **HTTP/2 Support** - Optional HTTP/2 support for improved performance

## 📋 Prerequisites

- Node.js 23.0.0 or higher
- pnpm 9.15.4 or higher
- Git
- [mkcert](https://github.com/FiloSottile/mkcert) (for HTTPS setup)

## 🛠️ Installation

### 1. Basic Setup

```bash
# Clone the repository
git clone <repository-url>
cd vibe

# Install dependencies
pnpm install
```

### 2. HTTPS Setup (Required for WebRTC)

WebRTC requires secure contexts (HTTPS) to access camera and microphone. Set up local HTTPS using mkcert:

#### Install mkcert

**macOS:**
```bash
brew install mkcert
brew install nss # if you use Firefox
```

**Windows:**
```bash
choco install mkcert
# or using Scoop
scoop bucket add extras
scoop install mkcert
```

**Linux:**
```bash
# Using Homebrew on Linux
brew install mkcert

# Or download from https://github.com/FiloSottile/mkcert/releases
# Example for Linux x64:
wget https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x mkcert-v1.4.4-linux-amd64
sudo mv mkcert-v1.4.4-linux-amd64 /usr/local/bin/mkcert
```

#### Generate Local Certificates

```bash
# Install the local CA
mkcert -install

# Create certificates directory
mkdir -p certs

# Generate certificates for localhost
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1

# The certificates are now in the certs/ directory
```

### 3. Configure Environment (Optional)

For HTTPS mode, update the environment files:

**apps/web/.env.development:**
```env
# Change this line
NEXT_PUBLIC_SIGNALING_URL=https://localhost:4000
```

**apps/signaling/.env.development:**
```env
# Change this line
CLIENT_URL=https://localhost:3000
```

### 4. Run Development Servers

```bash
# Run with HTTPS enabled (recommended for WebRTC)
pnpm dev:https

# Or run with HTTP (WebRTC features will be limited)
pnpm dev
```

This will start:
- Web application at https://localhost:3000 (HTTPS) or http://localhost:3000 (HTTP)
- Signaling server at https://localhost:4000 (HTTPS) or http://localhost:4000 (HTTP)
- API documentation at https://localhost:4000/api-docs

**Note:** When using HTTPS, your browser may show a security warning. This is normal for local development. Click "Advanced" and "Proceed to localhost" to continue.

### 5. HTTP/2 Support (Enabled by Default)

HTTP/2 is automatically enabled when using HTTPS, providing:
- Multiplexed streams (multiple requests over single connection)
- Header compression
- Server push capabilities
- Binary protocol (more efficient than text-based HTTP/1.1)

To disable HTTP/2 and use HTTP/1.1 with TLS instead:
```env
# In apps/signaling/.env.development
USE_HTTP2=false
```

## 📁 Project Structure

```
vibe/
├── apps/
│   ├── web/                 # Next.js web application
│   │   ├── src/
│   │   │   ├── app/        # App router pages
│   │   │   ├── components/ # React components
│   │   │   ├── contexts/   # React contexts
│   │   │   └── lib/        # Utilities
│   │   └── package.json
│   │
│   └── signaling/          # Express/Socket.io signaling server
│       ├── src/
│       │   ├── index.ts    # Server entry point
│       │   └── __tests__/  # Server tests
│       └── package.json
│
├── docs/                   # Project documentation
│   ├── README.md          # Documentation index
│   ├── ARCHITECTURE.md    # System architecture
│   ├── CODING_STANDARDS.md # Code style guide
│   └── TESTING_STANDARDS.md # Testing guidelines
│
├── packages/              # Shared packages (future)
├── package.json          # Root package.json
├── pnpm-workspace.yaml   # Monorepo configuration
└── llm.txt              # AI assistant context
```

## 🔧 Available Scripts

From the root directory:

### Development
```bash
pnpm dev              # Run all services in parallel
pnpm dev:https        # Run all services with HTTPS
pnpm dev:docker       # Run with Caddy proxy (HTTP/3, simulates Cloudflare)
pnpm dev:web          # Run only the web application
pnpm dev:signaling    # Run only the signaling server
pnpm check:https      # Check HTTPS certificate setup
```

### Docker Commands
```bash
pnpm docker:up        # Start Docker environment
pnpm docker:down      # Stop Docker environment
pnpm docker:logs      # View container logs
```

### Building
```bash
pnpm build            # Build all packages for production
```

### Testing
```bash
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
```

### Code Quality
```bash
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript type checking
```

## 🏗️ Architecture

### Web Application (Next.js)
- **Framework**: Next.js 15.3 with App Router
- **UI Library**: Chakra UI v3 with Emotion
- **State Management**: React Context API
- **Real-time**: Socket.io client

### Signaling Server (Express)
- **Framework**: Express 5 with TypeScript
- **WebSocket**: Socket.io for real-time communication
- **Architecture**: RESTful API + WebSocket events

### Key Technologies
- **React 19.1** - Latest React with Server Components
- **TypeScript 5** - Type safety across the stack
- **Vitest** - Fast unit testing framework
- **pnpm** - Efficient package management

## 🚦 Getting Started

1. **Start the development servers**
   ```bash
   pnpm dev
   ```

2. **Open the application**
   Navigate to http://localhost:3000

3. **Create or join a room**
   - Click "Create New Room" to start a session
   - Share the room ID with others
   - Or enter a room ID to join an existing session

## 📡 API Documentation

### REST Endpoints

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

## 🧪 Testing

The project uses Vitest for testing:

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test -- --coverage
```

## 🚀 Deployment

### Production Build

```bash
# Build all applications
pnpm build

# Start production servers
cd apps/web && pnpm start
cd apps/signaling && pnpm start
```

### Environment Variables

Create `.env` files in each app:

**apps/web/.env**
```env
NEXT_PUBLIC_SIGNALING_URL=https://your-signaling-server.com
```

**apps/signaling/.env**
```env
PORT=4000
NODE_ENV=production
CLIENT_URL=https://your-web-app.com
```

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Coding Standards](./docs/CODING_STANDARDS.md)
- [Testing Standards](./docs/TESTING_STANDARDS.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards
4. Write tests for new functionality
5. Commit your changes using conventional commits
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Chakra UI](https://chakra-ui.com/)
- Real-time communication via [Socket.io](https://socket.io/)
- WebRTC implementation inspired by best practices

---

Made with ❤️ using modern web technologies