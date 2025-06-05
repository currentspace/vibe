import { Box, Text, Heading, Badge } from '@chakra-ui/react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

async function getUser(id: string): Promise<User> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100))
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Developer'
  }
}

export async function UserCard({ userId }: { userId: string }) {
  const user = await getUser(userId)

  return (
    <Box borderWidth="1px" borderRadius="lg" p={5} maxW="sm">
      <Heading size="md" mb={2}>{user.name}</Heading>
      <Text color="gray.600" mb={2}>{user.email}</Text>
      <Badge colorScheme="purple">{user.role}</Badge>
    </Box>
  )
}