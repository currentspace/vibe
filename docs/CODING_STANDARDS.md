# Coding Standards

This document outlines the coding standards and best practices for the Vibe project. All contributors should follow these guidelines to maintain code quality and consistency.

## General Principles

1. **Clarity over Cleverness** - Write code that is easy to understand
2. **Consistency** - Follow existing patterns in the codebase
3. **Simplicity** - Avoid over-engineering solutions
4. **Documentation** - Comment complex logic and document APIs

## TypeScript Guidelines

### Type Safety

```typescript
// ✅ Good - Explicit types
interface User {
  id: string
  name: string
  email: string
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad - Using 'any'
function processData(data: any) {
  // Avoid 'any' type
}
```

### Naming Conventions

- **Files**: Use kebab-case for files (`user-card.tsx`, `api-client.ts`)
- **Components**: Use PascalCase (`UserCard`, `NavigationBar`)
- **Functions/Variables**: Use camelCase (`getUserById`, `isLoading`)
- **Constants**: Use UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `API_BASE_URL`)
- **Types/Interfaces**: Use PascalCase with descriptive names

```typescript
// File: user-types.ts
export interface UserProfile {
  id: string
  displayName: string
}

export type UserRole = 'admin' | 'user' | 'guest'

const MAX_USERNAME_LENGTH = 50
```

### Imports Organization

Order imports in the following groups, separated by blank lines:

```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { Box, Text } from '@chakra-ui/react'
import { io } from 'socket.io-client'

// 3. Internal imports (absolute paths)
import { Button } from '@/components/Button'
import { api } from '@/lib/api'

// 4. Relative imports
import { UserCard } from './UserCard'
import type { UserProps } from './types'
```

## React/Next.js Standards

### Component Structure

```typescript
// ✅ Good - Clear component structure
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  children: React.ReactNode
}

export function Button({ variant = 'primary', onClick, children }: ButtonProps) {
  // Hooks at the top
  const [isLoading, setIsLoading] = useState(false)
  
  // Event handlers
  const handleClick = () => {
    setIsLoading(true)
    onClick?.()
  }
  
  // Render
  return (
    <button onClick={handleClick} disabled={isLoading}>
      {children}
    </button>
  )
}
```

### Server vs Client Components

```typescript
// Server Component (default)
// ✅ Good - No 'use client' directive needed
export async function UserList() {
  const users = await fetchUsers() // Server-side data fetching
  
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}

// Client Component
// ✅ Good - Explicit 'use client' for interactivity
'use client'

export function InteractiveForm() {
  const [formData, setFormData] = useState({})
  // Client-side logic
}
```

### Hooks Best Practices

```typescript
// ✅ Good - Custom hook with clear naming
export function useWebRTC(roomId: string) {
  const [peers, setPeers] = useState<RTCPeerConnection[]>([])
  const [localStream, setLocalStream] = useState<MediaStream>()
  
  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup
    }
  }, [roomId])
  
  return { peers, localStream }
}
```

## API Design Standards

### REST API Conventions

```typescript
// ✅ Good - RESTful endpoints
app.get('/api/users', getAllUsers)          // GET collection
app.get('/api/users/:id', getUserById)     // GET single resource
app.post('/api/users', createUser)         // POST create
app.put('/api/users/:id', updateUser)      // PUT update
app.delete('/api/users/:id', deleteUser)   // DELETE remove

// Response format
interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    timestamp: string
    version: string
  }
}
```

### WebSocket Event Naming

```typescript
// ✅ Good - Consistent event naming
socket.on('user:joined', handleUserJoined)
socket.on('user:left', handleUserLeft)
socket.on('message:received', handleMessage)
socket.emit('room:join', { roomId, userId })
```

## Error Handling

### Try-Catch Patterns

```typescript
// ✅ Good - Proper error handling
export async function fetchUserData(id: string) {
  try {
    const response = await api.get(`/users/${id}`)
    return { data: response.data, error: null }
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return { 
      data: null, 
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_ERROR'
      }
    }
  }
}
```

### Error Boundaries

```typescript
// ✅ Good - Error boundary for sections
export function SafeSection({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      {children}
    </ErrorBoundary>
  )
}
```

## Code Organization

### File Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── index.ts        # Barrel exports
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
├── types/              # Shared TypeScript types
└── app/                # Next.js app directory
```

### Barrel Exports

```typescript
// components/index.ts
export { Button } from './Button'
export { Card } from './Card'
export { Input } from './Input'
```

## Performance Guidelines

### Memoization

```typescript
// ✅ Good - Memoize expensive computations
const ExpensiveComponent = memo(({ data }: Props) => {
  const processedData = useMemo(() => 
    expensiveProcessing(data), 
    [data]
  )
  
  return <div>{processedData}</div>
})
```

### Lazy Loading

```typescript
// ✅ Good - Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'))

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

## Comments and Documentation

### JSDoc Comments

```typescript
/**
 * Creates a WebRTC connection to the specified peer
 * @param peerId - The ID of the peer to connect to
 * @param config - Optional RTCConfiguration
 * @returns Promise resolving to the established connection
 * @throws {ConnectionError} If connection fails
 */
export async function connectToPeer(
  peerId: string, 
  config?: RTCConfiguration
): Promise<RTCPeerConnection> {
  // Implementation
}
```

### Inline Comments

```typescript
// ✅ Good - Explain why, not what
// We need to delay the connection to avoid race conditions
// when both peers try to connect simultaneously
setTimeout(() => {
  initiatePeerConnection()
}, 100)

// ❌ Bad - Obvious comment
// Set loading to true
setLoading(true)
```

## Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Test additions or fixes
- `chore`: Build process or auxiliary tool changes

### Examples

```bash
feat(web): add WebRTC video calling

Implement peer-to-peer video calling using WebRTC with
signaling through WebSocket connection. Includes:
- Camera/microphone permission handling
- Connection state management
- Error recovery mechanisms

Closes #123

fix(signaling): handle concurrent room joins

Prevent race condition when multiple users join a room
simultaneously by implementing a queue system.

test(web): add Button component tests

Add comprehensive test suite for Button component
including variant rendering and click handling.
```

## Code Review Checklist

Before submitting a PR, ensure:

- [ ] All tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Code follows linting rules (`pnpm lint`)
- [ ] New code has appropriate test coverage
- [ ] Complex logic is documented
- [ ] No console.log statements in production code
- [ ] Error cases are handled appropriately
- [ ] Performance implications considered
- [ ] Security best practices followed

## Security Guidelines

1. **Input Validation** - Always validate user input
2. **Sanitization** - Sanitize data before rendering
3. **Authentication** - Use proper authentication mechanisms
4. **HTTPS** - Always use HTTPS in production
5. **Secrets** - Never commit secrets to version control

```typescript
// ✅ Good - Environment variables for secrets
const apiKey = process.env.API_KEY

// ❌ Bad - Hardcoded secrets
const apiKey = 'sk-1234567890'
```

## Accessibility Standards

1. Use semantic HTML elements
2. Provide proper ARIA labels
3. Ensure keyboard navigation
4. Maintain proper color contrast
5. Include alt text for images

```typescript
// ✅ Good - Accessible button
<Button
  aria-label="Close dialog"
  onClick={handleClose}
>
  <CloseIcon />
</Button>
```