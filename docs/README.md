# Vibe Project Documentation

Welcome to the Vibe project documentation. This directory contains comprehensive documentation about the project's architecture, standards, and best practices.

## Table of Contents

- [Architecture](./ARCHITECTURE.md) - System design and technical architecture
- [Coding Standards](./CODING_STANDARDS.md) - Code style guidelines and best practices
- [Testing Standards](./TESTING_STANDARDS.md) - Testing strategies and requirements

## Quick Links

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)

## Getting Started

### Prerequisites

- Node.js 23.0.0 or higher
- pnpm 9.15.4 or higher
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd vibe

# Install dependencies
pnpm install

# Run development servers
pnpm dev
```

### Available Scripts

From the root directory:

```bash
# Development
pnpm dev              # Run all services in parallel
pnpm dev:web          # Run only the web application
pnpm dev:signaling    # Run only the signaling server

# Building
pnpm build            # Build all packages

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript type checking
```

## Project Structure

```
vibe/
├── apps/
│   ├── web/              # Next.js web application
│   │   ├── src/
│   │   │   ├── app/      # App router pages and layouts
│   │   │   └── components/ # React components
│   │   └── package.json
│   │
│   └── signaling/        # WebRTC signaling server
│       ├── src/
│       │   ├── index.ts  # Express/Socket.io server
│       │   └── __tests__/ # Server tests
│       └── package.json
│
├── packages/             # Shared packages (future)
├── docs/                 # Project documentation
└── pnpm-workspace.yaml   # Monorepo configuration
```

## Development Workflow

1. **Feature Development**
   - Create a feature branch from `main`
   - Make changes following our coding standards
   - Write tests for new functionality
   - Ensure all tests pass
   - Submit a pull request

2. **Code Review Process**
   - All code must be reviewed before merging
   - Ensure CI/CD checks pass
   - Address reviewer feedback
   - Squash commits when merging

3. **Testing Requirements**
   - Unit tests for all business logic
   - Integration tests for API endpoints
   - Component tests for UI elements
   - Maintain >80% code coverage

## Deployment

### Production Build

```bash
# Build all applications
pnpm build

# The built applications will be in:
# - apps/web/.next (Next.js)
# - apps/signaling/dist (Node.js)
```

### Environment Variables

Each application uses environment variables for configuration:

**Web Application (`apps/web/.env`)**
```env
NEXT_PUBLIC_SIGNALING_URL=http://localhost:4000
```

**Signaling Server (`apps/signaling/.env`)**
```env
PORT=4000
NODE_ENV=production
```

## Contributing

Please read our [Contributing Guidelines](./CONTRIBUTING.md) before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.