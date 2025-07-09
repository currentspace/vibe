'use client'

import { useState } from 'react'
import { Box, Container, Heading, Text, VStack, HStack, Button, Code, Stack } from '@chakra-ui/react'
import dynamic from 'next/dynamic'

const WebGLCanvas = dynamic(() => import('@/components/WebGLCanvas'), { ssr: false })
const ThreeJSExample = dynamic(() => import('@/components/ThreeJSExample'), { ssr: false })

export default function WebGLComparison() {
  const [activeExample, setActiveExample] = useState<'raw' | 'threejs'>('threejs')

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={4}>
            WebGL Approaches in React
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Comparing raw WebGL vs Three.js with React Three Fiber
          </Text>
        </Box>

        <HStack gap={4}>
          <Button
            onClick={() => setActiveExample('raw')}
            colorScheme={activeExample === 'raw' ? 'blue' : 'gray'}
          >
            Raw WebGL
          </Button>
          <Button
            onClick={() => setActiveExample('threejs')}
            colorScheme={activeExample === 'threejs' ? 'green' : 'gray'}
          >
            Three.js (R3F)
          </Button>
        </HStack>

        <Box
          borderWidth={1}
          borderRadius="lg"
          overflow="hidden"
          bg="white"
          shadow="lg"
          height="600px"
        >
          {activeExample === 'raw' ? <WebGLCanvas /> : <ThreeJSExample />}
        </Box>

        <Stack gap={6}>
          {activeExample === 'raw' ? (
            <Box>
              <Heading as="h2" size="lg" mb={4}>
                Raw WebGL Approach
              </Heading>
              
              <VStack align="start" gap={3}>
                <Text fontWeight="bold">Pros:</Text>
                <Text>✅ Maximum control over rendering pipeline</Text>
                <Text>✅ Smallest bundle size (~0 dependencies)</Text>
                <Text>✅ Direct shader programming</Text>
                <Text>✅ Best performance for specific use cases</Text>
                
                <Text fontWeight="bold" mt={4}>Cons:</Text>
                <Text>❌ Verbose and complex code</Text>
                <Text>❌ Manual resource management</Text>
                <Text>❌ No built-in helpers (cameras, lights, etc.)</Text>
                <Text>❌ Steeper learning curve</Text>
                
                <Text fontWeight="bold" mt={4}>Best for:</Text>
                <Text>• Custom shader effects</Text>
                <Text>• Learning WebGL fundamentals</Text>
                <Text>• Highly optimized specific visualizations</Text>
                
                <Box mt={4} p={4} bg="gray.100" borderRadius="md">
                  <Text fontWeight="bold" mb={2}>Code Example:</Text>
                  <Code display="block" whiteSpace="pre" fontSize="sm">{`gl.useProgram(program)
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
gl.drawArrays(gl.TRIANGLES, 0, 3)`}</Code>
                </Box>
              </VStack>
            </Box>
          ) : (
            <Box>
              <Heading as="h2" size="lg" mb={4}>
                Three.js with React Three Fiber
              </Heading>
              
              <VStack align="start" gap={3}>
                <Text fontWeight="bold">Pros:</Text>
                <Text>✅ Declarative, React-like API</Text>
                <Text>✅ Huge ecosystem of helpers and plugins</Text>
                <Text>✅ Automatic memory management</Text>
                <Text>✅ Built-in lights, cameras, materials</Text>
                <Text>✅ Great documentation and community</Text>
                
                <Text fontWeight="bold" mt={4}>Cons:</Text>
                <Text>❌ Larger bundle size (~150kb gzipped)</Text>
                <Text>❌ Abstraction overhead</Text>
                <Text>❌ Less control over low-level optimizations</Text>
                
                <Text fontWeight="bold" mt={4}>Best for:</Text>
                <Text>• 3D applications and games</Text>
                <Text>• Complex scenes with many objects</Text>
                <Text>• Rapid prototyping</Text>
                <Text>• Teams familiar with React</Text>
                
                <Box mt={4} p={4} bg="gray.100" borderRadius="md">
                  <Text fontWeight="bold" mb={2}>Code Example:</Text>
                  <Code display="block" whiteSpace="pre" fontSize="sm">{`<Canvas>
  <ambientLight />
  <Box position={[0, 0, 0]}>
    <meshStandardMaterial color="hotpink" />
  </Box>
  <OrbitControls />
</Canvas>`}</Code>
                </Box>
              </VStack>
            </Box>
          )}
          
          <Box p={4} bg="blue.50" borderRadius="md">
            <Heading as="h3" size="md" mb={2}>
              Recommendation
            </Heading>
            <Text>
              For most React applications, <strong>Three.js with React Three Fiber</strong> is the better choice. 
              It provides a much more ergonomic API, better developer experience, and faster development time. 
              Only use raw WebGL when you need specific optimizations or are building educational content about WebGL itself.
            </Text>
          </Box>
        </Stack>
      </VStack>
    </Container>
  )
}