'use client'

import { useState } from 'react'
import { Box, Container, Heading, Text, VStack, HStack, Button, Grid, Badge } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamic imports to avoid SSR issues
const KintsugiWebGL = dynamic(() => import('@/components/KintsugiWebGL'), { ssr: false })
const KintsugiThreeJS = dynamic(() => import('@/components/KintsugiThreeJS'), { ssr: false })

export default function KintsugiPage() {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <Container maxW="container.2xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={4}>
            Kintsugi WebGL Effect
          </Heading>
          <Text fontSize="lg" color="gray.600" mb={2}>
            Watch as slate cracks and fills with flowing gold
          </Text>
          <Text fontSize="sm" color="gray.500">
            Inspired by the Japanese art of repairing broken pottery with gold
          </Text>
        </Box>

        <HStack justify="center" gap={4}>
          <Button
            onClick={() => setShowComparison(!showComparison)}
            colorScheme="purple"
          >
            {showComparison ? 'Single View' : 'Compare Implementations'}
          </Button>
          <Link href="/webgl">
            <Button variant="outline">
              Back to WebGL Demos
            </Button>
          </Link>
        </HStack>

        {showComparison ? (
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
            <Box>
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between">
                  <Heading as="h3" size="lg">
                    Pure WebGL
                  </Heading>
                  <Badge colorScheme="orange">Shader-based</Badge>
                </HStack>
                
                <Box
                  borderWidth={1}
                  borderRadius="lg"
                  overflow="hidden"
                  bg="white"
                  shadow="lg"
                  height="500px"
                >
                  <KintsugiWebGL />
                </Box>

                <VStack align="start" gap={2} fontSize="sm">
                  <Text fontWeight="bold">Features:</Text>
                  <Text>• Procedural crack generation</Text>
                  <Text>• Custom fragment shaders</Text>
                  <Text>• Texture blending</Text>
                  <Text>• Minimal dependencies</Text>
                </VStack>
              </VStack>
            </Box>

            <Box>
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between">
                  <Heading as="h3" size="lg">
                    Three.js (R3F)
                  </Heading>
                  <Badge colorScheme="green">3D Scene</Badge>
                </HStack>
                
                <Box
                  borderWidth={1}
                  borderRadius="lg"
                  overflow="hidden"
                  bg="white"
                  shadow="lg"
                  height="500px"
                >
                  <KintsugiThreeJS />
                </Box>

                <VStack align="start" gap={2} fontSize="sm">
                  <Text fontWeight="bold">Features:</Text>
                  <Text>• 3D plane with displacement</Text>
                  <Text>• Interactive orbit controls</Text>
                  <Text>• Built-in texture loader</Text>
                  <Text>• Perspective camera</Text>
                </VStack>
              </VStack>
            </Box>
          </Grid>
        ) : (
          <Box>
            <Box
              borderWidth={1}
              borderRadius="lg"
              overflow="hidden"
              bg="white"
              shadow="lg"
              height="600px"
            >
              <KintsugiWebGL />
            </Box>
          </Box>
        )}

        <Box p={6} bg="purple.50" borderRadius="lg">
          <Heading as="h3" size="md" mb={4}>
            Animation Stages
          </Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
            <Box>
              <Text fontWeight="bold" color="purple.700">1. Slate (0-2s)</Text>
              <Text fontSize="sm">Original slate texture displayed</Text>
            </Box>
            <Box>
              <Text fontWeight="bold" color="purple.700">2. Cracking (2-4s)</Text>
              <Text fontSize="sm">Procedural cracks appear and grow</Text>
            </Box>
            <Box>
              <Text fontWeight="bold" color="purple.700">3. Filling (4-7s)</Text>
              <Text fontSize="sm">Gold gradually fills the cracks</Text>
            </Box>
            <Box>
              <Text fontWeight="bold" color="purple.700">4. Flowing (7s+)</Text>
              <Text fontSize="sm">Gold texture animates with flow effect</Text>
            </Box>
          </Grid>
        </Box>

        <Box p={6} bg="gray.50" borderRadius="lg">
          <Heading as="h3" size="md" mb={2}>
            Technical Details
          </Heading>
          <VStack align="start" gap={2}>
            <Text>
              <strong>Crack Generation:</strong> Uses layered Perlin noise to create organic, branching crack patterns
            </Text>
            <Text>
              <strong>Texture Blending:</strong> Fragment shader mixes slate and gold textures based on crack mask
            </Text>
            <Text>
              <strong>Flow Effect:</strong> UV coordinates are animated with sine waves for liquid gold appearance
            </Text>
            <Text>
              <strong>Performance:</strong> Runs at 60 FPS with efficient shader-based rendering
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}