'use client'

import { Container, VStack, Heading, Grid, GridItem } from '@chakra-ui/react'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { RoomManager } from '@/components/RoomManager'
import { ParticipantList } from '@/components/ParticipantList'
import { WebRTCProvider } from '@/contexts/WebRTCContext'

export default function ConnectPage() {
  return (
    <WebRTCProvider>
      <Container maxW="container.xl" py={10}>
        <VStack spacing={8} align="stretch">
          <Heading size="xl" textAlign="center">
            WebRTC Connection Hub
          </Heading>
          
          <Grid
            templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }}
            gap={6}
          >
            <GridItem colSpan={{ base: 1, lg: 1 }}>
              <VStack spacing={4} align="stretch">
                <ConnectionStatus />
                <RoomManager />
              </VStack>
            </GridItem>
            
            <GridItem colSpan={{ base: 1, lg: 2 }}>
              <ParticipantList />
            </GridItem>
          </Grid>
        </VStack>
      </Container>
    </WebRTCProvider>
  )
}