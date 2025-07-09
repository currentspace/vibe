# Contributing to Vibe

Thank you for your interest in contributing to Vibe! This document provides guidelines for contributing to our WebRTC video chat monorepo.

## Development Setup

### Prerequisites

- Node.js >=24.0.0
- pnpm 10.12.4
- Git
- mkcert (for HTTPS development)

### Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd vibe

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development servers
pnpm dev
```

## Monorepo Structure

Vibe uses pnpm workspaces with the following structure:

```
vibe/
├── apps/                    # Applications
│   ├── web/                # Next.js web app
│   └── signaling/          # Express.js server
├── packages/               # Shared packages
│   ├── core/              # Types & utilities
│   ├── api/               # API client/server
│   └── components/        # React components
└── docs/                  # Documentation
```

## Development Workflow

### Working with Packages

```bash
# Run command in specific package
pnpm --filter=@vibe/core build
pnpm --filter=web test

# Add dependency to specific package
pnpm add <package> --filter=@vibe/components
pnpm add -D <package> --filter=signaling

# Update dependencies
pnpm update -r --latest
```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the package architecture
   - Add/update tests
   - Update documentation

3. **Test your changes**
   ```bash
   pnpm test        # Run all tests
   pnpm typecheck   # Check TypeScript
   pnpm lint        # Check linting
   ```

4. **Build packages**
   ```bash
   pnpm build       # Build all packages
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable names
- Document complex functions

### React Components

```tsx
// Use function components
export function MyComponent({ prop }: MyComponentProps) {
  return <div>{prop}</div>
}

// Include TypeScript interfaces
interface MyComponentProps {
  prop: string
}

// Support className for styling
<Component className={className} />
```

### Package Guidelines

#### @vibe/core
- Zero external dependencies
- Pure functions where possible
- Comprehensive type definitions
- Well-documented utilities

#### @vibe/api
- Type-safe API contracts
- Proper error handling
- Event emitter patterns
- Promise-based APIs

#### @vibe/components
- Reusable components
- Proper prop interfaces
- Loading/error states
- Accessibility support

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage

# Test specific package
pnpm --filter=@vibe/core test
```

### Writing Tests

- Co-locate test files with source code
- Use descriptive test names
- Test edge cases
- Mock external dependencies
- Aim for high coverage

Example test:
```typescript
import { describe, it, expect } from 'vitest'
import { generateRoomId } from './utils'

describe('generateRoomId', () => {
  it('should generate valid room ID', () => {
    const id = generateRoomId()
    expect(id).toMatch(/^room-\d{13}-[a-z0-9]{9}$/)
  })
})
```

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

Examples:
```bash
git commit -m "feat: add video recording support"
git commit -m "fix: resolve connection timeout issue"
git commit -m "docs: update API documentation"
```

## Pull Request Process

1. **Update documentation** for any API changes
2. **Add tests** for new functionality
3. **Ensure CI passes** (tests, lint, build)
4. **Request review** from maintainers
5. **Address feedback** promptly

### PR Title Format

Use the same conventional commit format for PR titles:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`

## Package Dependencies

When adding dependencies:

1. **Consider the package's role**
   - @vibe/core should have zero dependencies
   - Minimize dependencies in shared packages
   - Keep heavy dependencies in apps

2. **Use workspace protocol**
   ```json
   {
     "dependencies": {
       "@vibe/core": "workspace:*"
     }
   }
   ```

3. **Avoid duplicate dependencies**
   - Check if dependency exists in other packages
   - Consider hoisting to root if used widely

## Documentation

### Where to Document

- **Package README**: Package-specific documentation
- **Code comments**: Complex logic and algorithms
- **Type definitions**: Interface and type documentation
- **API docs**: OpenAPI/Swagger for REST endpoints

### Documentation Style

- Be concise but comprehensive
- Include code examples
- Document edge cases
- Keep documentation up-to-date

## Debugging

### Common Issues

1. **Build errors**
   ```bash
   pnpm clean      # Clean all build artifacts
   pnpm install    # Reinstall dependencies
   pnpm build      # Rebuild packages
   ```

2. **Type errors**
   ```bash
   pnpm typecheck  # Check all packages
   ```

3. **Dependency issues**
   ```bash
   pnpm why <package>  # Check dependency tree
   ```

## Release Process

1. Ensure all tests pass
2. Update version numbers
3. Update CHANGELOG
4. Create release PR
5. Tag release after merge

## Getting Help

- **Discord**: Join our community
- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what's best for the community

## License

By contributing, you agree that your contributions will be licensed under the MIT License.