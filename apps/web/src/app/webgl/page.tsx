'use client'

import { Suspense } from 'react'
import { Box, Container, Heading, Text, VStack, HStack, Button } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamically import the WebGL component to avoid SSR issues
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

export default function WebGLPage() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
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
          <VStack align="start" mt={2} gap={1}>
            <Text>• React 19 with automatic batching</Text>
            <Text>• useEffect with cleanup for WebGL context</Text>
            <Text>• ResizeObserver for responsive canvas</Text>
            <Text>• Proper WebGL resource management</Text>
          </VStack>
          
          <HStack mt={4} gap={4} wrap="wrap">
            <Link href="/webgl/compare">
              <Button colorScheme="blue" size="lg">
                View WebGL vs Three.js Comparison →
              </Button>
            </Link>
            <Link href="/webgl/kintsugi">
              <Button colorScheme="purple" size="lg">
                Kintsugi Gold Effect →
              </Button>
            </Link>
          </HStack>
        </Box>
      </VStack>
    </Container>
  )
}