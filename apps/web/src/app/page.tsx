import { Container, Heading, Text, Box, Link, VStack } from '@chakra-ui/react'
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
            Next.js 15 + React 19.1 + Chakra UI v3
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
            <Text>✅ Jest + React Testing Library</Text>
            <Text>✅ TypeScript + ESLint + Prettier</Text>
          </VStack>
        </Box>

        <Box>
          <Link href="/demo">
            <Button size="lg">View Demo Page</Button>
          </Link>
        </Box>
      </VStack>
    </Container>
  )
}
