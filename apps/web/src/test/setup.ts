import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock structuredClone if not available
if (!global.structuredClone) {
  global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val))
}

// Mock Chakra UI's keyframes function
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react')
  return {
    ...actual,
    keyframes: (strings: TemplateStringsArray) => {
      // Return a simple string representation for testing
      return strings.join('')
    }
  }
})