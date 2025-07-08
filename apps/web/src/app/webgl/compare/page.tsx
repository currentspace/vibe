'use client'

import { useState } from 'react'
import { Box, Container, Heading, Text, VStack, HStack, Button, Grid, Badge } from '@chakra-ui/react'
import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR issues
const ModernWebGL = dynamic(() => import('@/components/ModernWebGL'), { ssr: false })
const ThreeJSHexagon = dynamic(() => import('@/components/ThreeJSHexagon'), { ssr: false })

export default function WebGLComparePage() {
  const [showComparison, setShowComparison] = useState(true)

  return (
    <Container maxW="container.2xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={4}>
            WebGL Implementation Comparison
          </Heading>
          <Box bg="blue.50" p={4} borderRadius="md" mb={4}>
            <Text color="blue.800">
              ℹ️ We now use React Three Fiber exclusively for all new 3D features.
            </Text>
          </Box>
          <Text fontSize="lg" color="gray.600">
            Historical comparison showing why we migrated from pure WebGL to React Three Fiber
          </Text>
        </Box>

        <HStack justify="center" gap={4}>
          <Button
            onClick={() => setShowComparison(!showComparison)}
            colorScheme="blue"
          >
            {showComparison ? 'Show Full Screen' : 'Show Side by Side'}
          </Button>
        </HStack>

        {showComparison ? (
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
            <Box>
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between">
                  <Heading as="h3" size="lg">
                    Pure WebGL
                  </Heading>
                  <Badge colorScheme="orange">Manual Implementation</Badge>
                </HStack>
                
                <Box
                  borderWidth={1}
                  borderRadius="lg"
                  overflow="hidden"
                  bg="white"
                  shadow="lg"
                  height="500px"
                >
                  <ModernWebGL />
                </Box>

                <VStack align="start" gap={2} fontSize="sm">
                  <Text fontWeight="bold">Characteristics:</Text>
                  <Text>• Direct WebGL API calls</Text>
                  <Text>• Manual shader compilation</Text>
                  <Text>• Manual buffer management</Text>
                  <Text>• ~50KB of code</Text>
                  <Text>• Full control over pipeline</Text>
                </VStack>
              </VStack>
            </Box>

            <Box>
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between">
                  <Heading as="h3" size="lg">
                    Three.js (R3F)
                  </Heading>
                  <Badge colorScheme="green">Declarative API</Badge>
                </HStack>
                
                <Box
                  borderWidth={1}
                  borderRadius="lg"
                  overflow="hidden"
                  bg="white"
                  shadow="lg"
                  height="500px"
                >
                  <ThreeJSHexagon />
                </Box>

                <VStack align="start" gap={2} fontSize="sm">
                  <Text fontWeight="bold">Characteristics:</Text>
                  <Text>• React components</Text>
                  <Text>• Automatic resource management</Text>
                  <Text>• Built-in controls & helpers</Text>
                  <Text>• ~150KB library (gzipped)</Text>
                  <Text>• Easier to maintain</Text>
                </VStack>
              </VStack>
            </Box>
          </Grid>
        ) : (
          <Box>
            <Grid templateColumns="1fr" gap={6}>
              <Box>
                <Heading as="h3" size="lg" mb={4}>
                  Pure WebGL Version
                </Heading>
                <Box
                  borderWidth={1}
                  borderRadius="lg"
                  overflow="hidden"
                  bg="white"
                  shadow="lg"
                  height="600px"
                >
                  <ModernWebGL />
                </Box>
              </Box>
            </Grid>
          </Box>
        )}

        <Box p={6} bg="blue.50" borderRadius="lg">
          <Heading as="h3" size="md" mb={4}>
            Key Differences
          </Heading>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
            <Box>
              <Text fontWeight="bold" mb={2}>Development Speed:</Text>
              <Text fontSize="sm">
                Three.js is 3-5x faster to develop with due to its high-level abstractions
                and extensive ecosystem of helpers.
              </Text>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>Performance:</Text>
              <Text fontSize="sm">
                Pure WebGL can be slightly faster for simple scenes, but Three.js has
                excellent optimizations for complex scenes.
              </Text>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>Bundle Size:</Text>
              <Text fontSize="sm">
                Pure WebGL: ~0KB extra, Three.js: ~150KB gzipped. Consider code splitting
                for Three.js.
              </Text>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>Maintainability:</Text>
              <Text fontSize="sm">
                Three.js code is more readable and maintainable, especially for teams
                and complex projects.
              </Text>
            </Box>
          </Grid>
        </Box>

        <Box p={6} bg="green.50" borderRadius="lg">
          <Heading as="h3" size="md" mb={2}>
            Recommendation
          </Heading>
          <Text>
            For most React applications, <strong>Three.js with React Three Fiber</strong> is 
            the better choice unless you have specific requirements for minimal bundle size 
            or need low-level GPU control. The developer experience and ecosystem make it 
            worth the additional bundle size for most 3D web applications.
          </Text>
        </Box>
      </VStack>
    </Container>
  )
}