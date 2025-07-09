'use client'

import { Suspense } from 'react'
import { Box, Container, Heading, Text, VStack, HStack, Button, Grid, Badge } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamically import the Three.js components to avoid SSR issues
const ThreeJSHexagon = dynamic(() => import('@/components/ThreeJSHexagon'), {
  ssr: false,
  loading: () => (
    <Box 
      width="100%" 
      height="600px" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
      bg="gray.100"
      borderRadius="md"
    >
      <Text>Loading 3D Scene...</Text>
    </Box>
  )
})

export default function WebGLPage() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={4}>
            3D Graphics with React Three Fiber
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Modern 3D rendering with React 19, Next.js 15, and Three.js
          </Text>
        </Box>

        <Box
          borderWidth={1}
          borderRadius="lg"
          overflow="hidden"
          bg="white"
          shadow="lg"
        >
          <Suspense fallback={<Box p={8}>Loading 3D context...</Box>}>
            <ThreeJSHexagon />
          </Suspense>
        </Box>

        <Box>
          <Heading as="h2" size="lg" mb={2}>
            Featured Examples
          </Heading>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mt={4}>
            <Box p={4} borderWidth={1} borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Heading as="h3" size="md">Animated Hexagon</Heading>
                <Badge colorScheme="green">Interactive</Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Rainbow hexagon with custom shaders, orbit controls, and real-time FPS monitoring
              </Text>
            </Box>
            <Box p={4} borderWidth={1} borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Heading as="h3" size="md">Kintsugi Effect</Heading>
                <Badge colorScheme="purple">Advanced</Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Slate texture that cracks and fills with flowing gold, inspired by Japanese art
              </Text>
            </Box>
          </Grid>
        </Box>

        <Box>
          <Heading as="h2" size="lg" mb={2}>
            Why React Three Fiber?
          </Heading>
          <VStack align="start" gap={1}>
            <Text>• Declarative 3D scenes with React components</Text>
            <Text>• Automatic memory management and cleanup</Text>
            <Text>• Rich ecosystem of helpers and controls</Text>
            <Text>• Custom shaders with easier integration</Text>
            <Text>• Built-in performance optimizations</Text>
          </VStack>
        </Box>
          
        <HStack gap={4} wrap="wrap" justify="center">
          <Link href="/webgl/kintsugi">
            <Button colorScheme="purple" size="lg">
              View Kintsugi Effect →
            </Button>
          </Link>
          <Link href="/webgl/compare">
            <Button colorScheme="blue" size="lg">
              Compare Implementations →
            </Button>
          </Link>
          <Link href="/webgl/legacy">
            <Button variant="outline" size="lg">
              Legacy Pure WebGL →
            </Button>
          </Link>
        </HStack>
      </VStack>
    </Container>
  )
}