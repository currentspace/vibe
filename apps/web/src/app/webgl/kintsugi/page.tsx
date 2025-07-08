'use client'

import { Box, Heading, Text, VStack, HStack, Button } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamic imports to avoid SSR issues
const KintsugiThreeJS = dynamic(() => import('@/components/KintsugiThreeJS'), { ssr: false })

export default function KintsugiPage() {
  return (
    <Box width="100vw" height="100vh" overflow="hidden" display="flex" flexDirection="column">
      {/* Header */}
      <HStack justify="space-between" p={4} bg="white" shadow="sm">
        <VStack align="start" gap={0}>
          <Heading as="h1" size="lg">
            Interactive Kintsugi Effect
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Adjust parameters to customize the golden repair effect
          </Text>
        </VStack>
        <Link href="/webgl">
          <Button variant="outline" size="sm">
            Back to 3D Demos
          </Button>
        </Link>
      </HStack>
      
      {/* Main Content */}
      <Box flex={1} overflow="hidden">
        <KintsugiThreeJS />
      </Box>
    </Box>
  )
}