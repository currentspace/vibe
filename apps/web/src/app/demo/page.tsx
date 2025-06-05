import { Suspense } from 'react'
import { UserCard } from '@/components/UserCard'
import { Button } from '@/components/Button'
import { Box, Container, Heading, Spinner, Text } from '@chakra-ui/react'

export default function DemoPage() {
  return (
    <Container maxW="container.lg" py={10}>
      <Heading mb={6}>React Server Components Demo</Heading>
      
      <Box mb={8}>
        <Text mb={4}>This is a server component with client components:</Text>
        <Button variant="primary" mr={2}>Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
      </Box>

      <Box>
        <Text mb={4}>Server Component with Async Data:</Text>
        <Suspense fallback={<Spinner />}>
          <UserCard userId="123" />
        </Suspense>
      </Box>
    </Container>
  )
}