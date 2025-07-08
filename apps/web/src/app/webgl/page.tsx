'use client'

import { Suspense } from 'react'
import { Box, Container, Heading, Text, VStack, Button } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamically import the WebGL component to avoid SSR issues
const WebGLCanvas = dynamic(() => import('@/components/WebGLCanvas'), {
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

const ModernWebGL = dynamic(() => import('@/components/ModernWebGL'), {
  ssr: false
})

export default function WebGLPage() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={4}>
            WebGL Playground
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Modern WebGL rendering with React 19 and Next.js 15
          </Text>
        </Box>

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

        <Box>
          <Heading as="h2" size="lg" mb={2}>
            About this Demo
          </Heading>
          <Text color="gray.600">
            This WebGL component uses modern React patterns including:
          </Text>
          <VStack align="start" mt={2} spacing={1}>
            <Text>• React 19 with automatic batching</Text>
            <Text>• useEffect with cleanup for WebGL context</Text>
            <Text>• ResizeObserver for responsive canvas</Text>
            <Text>• Proper WebGL resource management</Text>
          </VStack>
          
          <Box mt={4}>
            <Link href="/webgl/compare">
              <Button colorScheme="blue" size="lg">
                View WebGL vs Three.js Comparison →
              </Button>
            </Link>
          </Box>
        </Box>
      </VStack>
    </Container>
  )
}