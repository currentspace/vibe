# Testing Standards

This document outlines the testing philosophy, strategies, and standards for the Vibe project. Following these guidelines ensures high code quality and reliability.

## Testing Philosophy

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how it does it
2. **Clear Test Names** - Test names should describe what is being tested and expected outcome
3. **Isolated Tests** - Each test should be independent and not rely on others
4. **Fast Feedback** - Tests should run quickly to encourage frequent execution
5. **Meaningful Coverage** - Aim for quality over quantity in test coverage

## Testing Pyramid

```
         ╱─────────╲
        ╱   E2E     ╲     (5%)  - Critical user journeys
       ╱─────────────╲
      ╱ Integration   ╲   (25%) - API and component integration
     ╱─────────────────╲
    ╱     Unit Tests    ╲ (70%) - Business logic and utilities
   ╱─────────────────────╲
```

## Test Organization

### File Structure

```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       ├── Button.test.tsx      # Component tests
│       └── Button.stories.tsx   # Storybook stories (future)
├── lib/
│   └── utils/
│       ├── validation.ts
│       └── validation.test.ts   # Unit tests
└── __tests__/
    ├── integration/            # Integration tests
    └── e2e/                   # End-to-end tests
```

### Test File Naming

- Unit tests: `[filename].test.ts(x)`
- Integration tests: `[feature].integration.test.ts`
- E2E tests: `[userflow].e2e.test.ts`

## Unit Testing

### React Components

```typescript
// Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('should render with text content', () => {
    render(<Button>Click me</Button>)
    
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
  
  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('should be disabled when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>)
    
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Hooks Testing

```typescript
// useWebRTC.test.ts
import { renderHook, act } from '@testing-library/react'
import { useWebRTC } from './useWebRTC'

describe('useWebRTC', () => {
  it('should initialize with empty peers array', () => {
    const { result } = renderHook(() => useWebRTC('room-123'))
    
    expect(result.current.peers).toEqual([])
    expect(result.current.localStream).toBeUndefined()
  })
  
  it('should connect to peer when connectToPeer is called', async () => {
    const { result } = renderHook(() => useWebRTC('room-123'))
    
    await act(async () => {
      await result.current.connectToPeer('peer-456')
    })
    
    expect(result.current.peers).toHaveLength(1)
  })
})
```

### Utility Functions

```typescript
// validation.test.ts
import { validateEmail, validateRoomId } from './validation'

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it.each([
      ['user@example.com', true],
      ['test.user+tag@domain.co.uk', true],
      ['invalid-email', false],
      ['@example.com', false],
      ['user@', false],
    ])('should validate %s as %s', (email, expected) => {
      expect(validateEmail(email)).toBe(expected)
    })
  })
  
  describe('validateRoomId', () => {
    it('should accept valid UUID v4', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(validateRoomId(validUuid)).toBe(true)
    })
    
    it('should reject invalid formats', () => {
      expect(validateRoomId('not-a-uuid')).toBe(false)
      expect(validateRoomId('')).toBe(false)
    })
  })
})
```

## Integration Testing

### API Integration Tests

```typescript
// signaling.integration.test.ts
import request from 'supertest'
import { app } from '../app'
import { io as ioClient } from 'socket.io-client'

describe('Signaling Server Integration', () => {
  let server: any
  let client1: any
  let client2: any
  
  beforeAll((done) => {
    server = app.listen(0, () => done())
  })
  
  afterAll((done) => {
    server.close(done)
  })
  
  beforeEach(() => {
    const port = server.address().port
    client1 = ioClient(`http://localhost:${port}`)
    client2 = ioClient(`http://localhost:${port}`)
  })
  
  afterEach(() => {
    client1.disconnect()
    client2.disconnect()
  })
  
  it('should handle complete signaling flow', async () => {
    // 1. Create room
    const { body } = await request(app)
      .post('/api/rooms')
      .expect(200)
    
    const { roomId } = body
    
    // 2. Both clients join
    await new Promise((resolve) => {
      let joinCount = 0
      
      client1.on('room-participants', () => {
        joinCount++
        if (joinCount === 2) resolve(undefined)
      })
      
      client2.on('room-participants', () => {
        joinCount++
        if (joinCount === 2) resolve(undefined)
      })
      
      client1.emit('join-room', roomId, 'user1')
      client2.emit('join-room', roomId, 'user2')
    })
    
    // 3. Exchange offers
    const offerReceived = new Promise((resolve) => {
      client2.on('offer', (data) => {
        expect(data.userId).toBe('user1')
        resolve(undefined)
      })
    })
    
    client1.emit('offer', {
      roomId,
      userId: 'user1',
      targetUserId: 'user2',
      offer: { type: 'offer', sdp: 'mock-sdp' }
    })
    
    await offerReceived
  })
})
```

### Component Integration Tests

```typescript
// VideoCall.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { VideoCall } from '@/components/VideoCall'
import { mockMediaDevices } from '@/test-utils/mockWebRTC'

describe('VideoCall Integration', () => {
  beforeEach(() => {
    mockMediaDevices()
  })
  
  it('should request camera permissions and display local video', async () => {
    render(<VideoCall roomId="test-room" />)
    
    // Should show permission request UI
    expect(screen.getByText('Requesting camera access...')).toBeInTheDocument()
    
    // Wait for permission grant
    await waitFor(() => {
      expect(screen.getByTestId('local-video')).toBeInTheDocument()
    })
    
    // Video element should have stream
    const video = screen.getByTestId('local-video') as HTMLVideoElement
    expect(video.srcObject).toBeInstanceOf(MediaStream)
  })
})
```

## E2E Testing (Future)

### Playwright Tests

```typescript
// video-call.e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('Video Call Flow', () => {
  test('should complete video call between two users', async ({ browser }) => {
    // Create two browser contexts (users)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    // User 1 creates a room
    await page1.goto('/')
    await page1.click('text=Create Room')
    const roomUrl = await page1.url()
    
    // User 2 joins the room
    await page2.goto(roomUrl)
    
    // Both grant permissions
    await page1.click('text=Allow Camera')
    await page2.click('text=Allow Camera')
    
    // Verify connection established
    await expect(page1.locator('[data-testid="remote-video"]')).toBeVisible()
    await expect(page2.locator('[data-testid="remote-video"]')).toBeVisible()
  })
})
```

## Test Data Management

### Fixtures

```typescript
// fixtures/users.ts
export const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user' as const
}

export const mockAdmin = {
  ...mockUser,
  id: 'admin-456',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin' as const
}
```

### Test Factories

```typescript
// factories/room.factory.ts
import { v4 as uuidv4 } from 'uuid'

export class RoomFactory {
  static create(overrides = {}) {
    return {
      id: uuidv4(),
      participants: [],
      createdAt: new Date(),
      ...overrides
    }
  }
  
  static createWithParticipants(count: number) {
    const participants = Array.from({ length: count }, (_, i) => `user-${i}`)
    return this.create({ participants })
  }
}
```

## Mocking Strategies

### Module Mocking

```typescript
// Mock Socket.io
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }))
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
  }),
  useSearchParams: () => new URLSearchParams(),
}))
```

### WebRTC Mocking

```typescript
// test-utils/mockWebRTC.ts
export function mockMediaDevices() {
  const mockStream = {
    getTracks: () => [],
    getVideoTracks: () => [{ stop: vi.fn() }],
    getAudioTracks: () => [{ stop: vi.fn() }],
  }
  
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
      enumerateDevices: vi.fn().mockResolvedValue([
        { kind: 'videoinput', deviceId: 'camera1', label: 'Camera 1' },
        { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone 1' },
      ]),
    },
    writable: true,
  })
}
```

## Test Coverage

### Coverage Goals

- **Overall**: Minimum 80% coverage
- **Critical Paths**: 95%+ coverage
- **New Code**: 90%+ coverage

### Coverage Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.stories.tsx',
        'src/**/index.ts', // Barrel exports
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        './src/lib/': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
})
```

## Performance Testing

### Component Performance

```typescript
import { render } from '@testing-library/react'
import { measureRender } from '@/test-utils/performance'

test('Button should render quickly', async () => {
  const renderTime = await measureRender(() => 
    render(<Button>Click me</Button>)
  )
  
  expect(renderTime).toBeLessThan(16) // Under one frame (60fps)
})
```

## Testing Best Practices

### Do's
- ✅ Write tests before fixing bugs
- ✅ Test edge cases and error conditions
- ✅ Use meaningful test descriptions
- ✅ Keep tests simple and focused
- ✅ Clean up after tests (close connections, clear timers)
- ✅ Use data-testid for E2E test selectors

### Don'ts
- ❌ Don't test implementation details
- ❌ Don't use random/time-based data without mocking
- ❌ Don't skip tests without explanation
- ❌ Don't rely on test execution order
- ❌ Don't mock everything - test real integrations when possible

## Continuous Integration

### Pre-commit Hooks

```json
// .husky/pre-commit
{
  "hooks": {
    "pre-commit": "pnpm test:staged && pnpm lint:staged"
  }
}
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
test:
  - pnpm install
  - pnpm typecheck
  - pnpm lint
  - pnpm test --coverage
  - pnpm test:integration
  - Upload coverage reports
```

## Test Debugging

### Debug Output

```typescript
// Use screen.debug() for component state
screen.debug()

// Use console.log with proper cleanup
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

### VSCode Debug Configuration

```json
{
  "type": "node",
  "name": "Debug Vitest Tests",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/vitest",
  "args": ["--run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```