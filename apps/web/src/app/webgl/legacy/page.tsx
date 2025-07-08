'use client'

import { Suspense } from 'react'
import { Box, Container, Heading, Text, VStack, Alert, AlertIcon } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamically import the WebGL components to avoid SSR issues
const ModernWebGL = dynamic(() => import('@/components/ModernWebGL'), {
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
      <Text>Loading WebGL...</Text>
    </Box>
  )
})

const SimpleWebGL = dynamic(() => import('@/components/SimpleWebGL'), {
  ssr: false
})

const WebGLCanvas = dynamic(() => import('@/components/WebGLCanvas'), {
  ssr: false
})

export default function LegacyWebGLPage() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={4}>
            Legacy Pure WebGL Examples
          </Heading>
          <Alert status="warning" mb={4}>
            <AlertIcon />
            These are legacy pure WebGL implementations. We now use React Three Fiber for all 3D graphics.
            <Link href="/webgl" style={{ marginLeft: '8px', textDecoration: 'underline' }}>
              View modern examples →
            </Link>
          </Alert>
          <Text fontSize="lg" color="gray.600">
            Raw WebGL implementations kept for reference and learning purposes
          </Text>
        </Box>

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Modern WebGL Component
          </Heading>
          <Text color="gray.600" mb={4}>
            Animated hexagon with custom shaders and FPS counter
          </Text>
          <Box
            borderWidth={1}
            borderRadius="lg"
            overflow="hidden"
            bg="white"
            shadow="lg"
          >
            <Suspense fallback={<Box p={8}>Loading WebGL context...</Box>}>
              <ModernWebGL />
            </Suspense>
          </Box>
        </Box>

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Simple WebGL Triangle
          </Heading>
          <Text color="gray.600" mb={4}>
            Basic red triangle - minimal WebGL example
          </Text>
          <Box
            borderWidth={1}
            borderRadius="lg"
            overflow="hidden"
            bg="white"
            shadow="lg"
            height="400px"
          >
            <Suspense fallback={<Box p={8}>Loading WebGL context...</Box>}>
              <SimpleWebGL />
            </Suspense>
          </Box>
        </Box>

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Original WebGL Canvas (Deprecated)
          </Heading>
          <Text color="gray.600" mb={4}>
            First attempt with issues - kept for reference
          </Text>
          <Box
            borderWidth={1}
            borderRadius="lg"
            overflow="hidden"
            bg="white"
            shadow="lg"
            height="400px"
          >
            <Suspense fallback={<Box p={8}>Loading WebGL context...</Box>}>
              <WebGLCanvas />
            </Suspense>
          </Box>
        </Box>

        <Box p={4} bg="gray.50" borderRadius="md">
          <Heading as="h3" size="md" mb={2}>
            Why We Moved to React Three Fiber
          </Heading>
          <VStack align="start" gap={2}>
            <Text>• Declarative API is easier to maintain</Text>
            <Text>• Automatic memory management prevents leaks</Text>
            <Text>• Rich ecosystem of helpers and plugins</Text>
            <Text>• Better TypeScript support</Text>
            <Text>• Simplified shader management</Text>
            <Text>• Built-in performance optimizations</Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}