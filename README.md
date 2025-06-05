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

## 📋 Prerequisites

- Node.js 23.0.0 or higher
- pnpm 9.15.4 or higher
- Git

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd vibe

# Install dependencies
pnpm install

# Run development servers
pnpm dev
```

This will start:
- Web application at http://localhost:3000
- Signaling server at http://localhost:4000

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
pnpm dev:web          # Run only the web application
pnpm dev:signaling    # Run only the signaling server
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