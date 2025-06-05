import { render, screen } from '@testing-library/react'
import { Button } from '../Button'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

const renderWithChakra = (ui: React.ReactElement) => {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('Button', () => {
  it('renders with text', () => {
    renderWithChakra(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('renders primary variant by default', () => {
    renderWithChakra(<Button>Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('chakra-button')
  })

  it('renders secondary variant', () => {
    renderWithChakra(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('passes through additional props', () => {
    renderWithChakra(<Button data-testid="custom-button">Test</Button>)
    expect(screen.getByTestId('custom-button')).toBeInTheDocument()
  })
})