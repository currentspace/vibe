# Vibe Web Application

Next.js-based web application for the Vibe video chat platform.

## Overview

This is the main web application for Vibe, built with Next.js 15, React 19, and Chakra UI. It provides a modern, responsive interface for WebRTC-based video communication.

## Technology Stack

- **Next.js 15.3** - React framework with App Router
- **React 19.1** - UI library with Server Components
- **Chakra UI 3.22** - Component library
- **TypeScript 5.8** - Type safety
- **Socket.io Client** - WebSocket communication
- **@vibe/components** - Shared WebRTC components
- **@vibe/core** - Core types and utilities
- **@vibe/api** - API client

## Features

- Real-time video and audio communication
- Room-based video chat sessions
- Responsive design for all devices
- Server-side rendering with streaming
- WebGL demos and visualizations
- Modern UI with smooth animations

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   ├── connect/           # Video chat interface
│   │   └── page.tsx      # Main video chat page
│   └── webgl/            # WebGL demos
│       ├── page.tsx      # WebGL examples
│       ├── kintsugi/     # Kintsugi shader demo
│       ├── legacy/       # Legacy WebGL demo
│       └── compare/      # Comparison demo
├── components/           # App-specific components
│   ├── RoomManager.tsx  # Room creation/joining UI
│   ├── ClientOnly.tsx   # Client-side wrapper
│   └── WebGL/          # WebGL components
├── contexts/            # Legacy contexts (migrating)
└── lib/                # Utilities
    └── emotion-registry.tsx # Emotion CSS-in-JS
```

## Development

### Prerequisites

- Node.js >=24.0.0
- pnpm 10.12.4
- SSL certificates for HTTPS (see root README)

### Environment Variables

Create `.env.local`:

```env
# Required
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3005

# Optional
NEXT_PUBLIC_STUN_SERVERS=stun:stun.l.google.com:19302
NEXT_PUBLIC_TURN_SERVERS=
```

### Running Locally

```bash
# Install dependencies (from root)
pnpm install

# Run development server
pnpm dev:web

# Or run with HTTPS
pnpm dev:https

# Build for production
pnpm --filter=web build

# Start production server
pnpm --filter=web start
```

### Available Scripts

- `dev` - Start development server
- `dev:https` - Start with HTTPS enabled
- `build` - Build for production
- `start` - Start production server
- `lint` - Run ESLint
- `test` - Run tests with Vitest
- `test:watch` - Run tests in watch mode
- `test:ui` - Run tests with UI
- `typecheck` - Run TypeScript compiler

## Pages

### Landing Page (`/`)
- Introduction to Vibe
- Quick access to create/join rooms
- Feature highlights

### Connect Page (`/connect`)
- Main video chat interface
- Room management
- Participant list
- Media controls

### WebGL Demos (`/webgl/*`)
- Interactive 3D visualizations
- Shader experiments
- Performance comparisons

## Key Components

### RoomManager
Handles room creation and joining logic:
- Create new rooms
- Join existing rooms
- Display connection status

### WebRTC Integration
Uses `@vibe/components` for:
- WebRTC context provider
- Media stream management
- Peer connection handling

### UI Components
Built with Chakra UI:
- Responsive layouts
- Dark mode support
- Accessible components

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test Button.test.tsx
```

Test files are located next to components:
- `*.test.tsx` - Component tests
- `*.test.ts` - Utility tests

## Building for Production

```bash
# Build the application
pnpm --filter=web build

# Analyze bundle size
pnpm --filter=web build -- --analyze
```

Build output:
- `.next/` - Build artifacts
- `out/` - Static export (if configured)

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Docker

```bash
# Build image
docker build -f Dockerfile.dev -t vibe-web .

# Run container
docker run -p 3000:3000 vibe-web
```

### Self-Hosted

1. Build the application
2. Set up Node.js server
3. Configure reverse proxy (nginx/Caddy)
4. Set environment variables

## Performance Optimization

- Server Components for reduced JavaScript
- Dynamic imports for code splitting
- Image optimization with next/image
- Font optimization with next/font
- Turbopack for faster development

## Troubleshooting

### HTTPS Issues
- Ensure certificates are generated
- Check certificate paths
- Verify browser accepts self-signed certs

### WebRTC Issues
- Check browser permissions
- Verify HTTPS is enabled
- Check firewall settings
- Test STUN/TURN connectivity

### Build Issues
- Clear `.next` directory
- Delete `node_modules` and reinstall
- Check TypeScript errors
- Verify environment variables

## License

MIT