import { Container, Heading, Text, Box, Link, VStack, HStack } from '@chakra-ui/react'
import { Button } from '@/components/Button'

export default function Home() {
  return (
    <Container maxW="container.lg" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            Vibe App
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Next.js 15 + React 19.1 + Chakra UI v3 + WebRTC
          </Text>
        </Box>

        <Box>
          <Heading size="lg" mb={4}>
            Tech Stack:
          </Heading>
          <VStack align="start" spacing={2}>
            <Text>✅ React 19.1 with Server Components</Text>
            <Text>✅ Next.js 15 with Turbopack</Text>
            <Text>✅ Node.js 24 runtime</Text>
            <Text>✅ Chakra UI v3 for styling</Text>
            <Text>✅ pnpm monorepo setup</Text>
            <Text>✅ Vitest + React Testing Library</Text>
            <Text>✅ TypeScript + ESLint + Prettier</Text>
            <Text>✅ WebRTC Signaling Server</Text>
            <Text>✅ Socket.io for real-time communication</Text>
          </VStack>
        </Box>

        <HStack spacing={4} justify="center">
          <Link href="/demo">
            <Button size="lg">View Demo Page</Button>
          </Link>
          <Link href="/connect">
            <Button size="lg" variant="primary" colorScheme="green">
              WebRTC Connect
            </Button>
          </Link>
        </HStack>
      </VStack>
    </Container>
  )
}
