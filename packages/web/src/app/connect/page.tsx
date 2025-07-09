'use client'

import { Container, Stack, Heading, Grid, GridItem } from '@chakra-ui/react'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { RoomManager } from '@/components/RoomManager'
import { ParticipantList } from '@/components/ParticipantList'
import { WebRTCProvider } from '@/contexts/WebRTCContext'
import { ClientOnly } from '@/components/ClientOnly'

export default function ConnectPage() {
  return (
    <ClientOnly>
      <WebRTCProvider>
        <Container maxW="container.xl" py={10}>
          <Stack gap={8}>
            <Heading size="xl" textAlign="center">
              WebRTC Connection Hub
            </Heading>
            
            <Grid
              templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }}
              gap={6}
            >
              <GridItem colSpan={{ base: 1, lg: 1 }}>
                <Stack gap={4}>
                  <ConnectionStatus />
                  <RoomManager />
                </Stack>
              </GridItem>
              
              <GridItem colSpan={{ base: 1, lg: 2 }}>
                <ParticipantList />
              </GridItem>
            </Grid>
          </Stack>
        </Container>
      </WebRTCProvider>
    </ClientOnly>
  )
}