'use client'

import { useState } from 'react'
import { 
  Box, 
  Stack, 
  Button, 
  Input, 
  Text, 
  Field,
  Separator,
  Toaster,
  createToaster,
} from '@chakra-ui/react'
import { useWebRTC } from '@/contexts/WebRTCContext'

const toaster = createToaster({
  placement: 'top',
  pauseOnPageIdle: true,
})

export function RoomManager() {
  const { createRoom, joinRoom, leaveRoom, currentRoom, isConnected } = useWebRTC()
  const [roomInput, setRoomInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  
  const showToast = (title: string, description?: string, status: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    toaster.create({
      title,
      description,
      type: status,
      duration: status === 'error' ? 5000 : 3000,
    })
  }

  const handleCreateRoom = async () => {
    if (!isConnected) {
      showToast('Not connected', 'Please wait for the connection to establish', 'warning')
      return
    }

    setIsCreating(true)
    try {
      const roomId = await createRoom()
      joinRoom(roomId)
      showToast('Room created', `Room ID: ${roomId}`, 'success')
    } catch {
      showToast('Failed to create room', undefined, 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = () => {
    if (!roomInput.trim()) {
      showToast('Room ID required', 'Please enter a room ID', 'warning')
      return
    }

    if (!isConnected) {
      showToast('Not connected', 'Please wait for the connection to establish', 'warning')
      return
    }

    setIsJoining(true)
    joinRoom(roomInput.trim())
    setRoomInput('')
    setTimeout(() => setIsJoining(false), 500)
  }

  const handleLeaveRoom = () => {
    leaveRoom()
    showToast('Left room')
  }

  const copyRoomId = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom)
      showToast('Room ID copied', undefined, 'success')
    }
  }

  return (
    <Box
      p={6}
      borderWidth="1px"
      borderRadius="lg"
      borderColor="gray.200"
      bg="white"
      shadow="sm"
    >
      <Stack gap={4}>
        <Text fontSize="xl" fontWeight="bold">Room Management</Text>
        
        {!currentRoom ? (
            <Stack gap={4}>
              <Button
                colorScheme="blue"
                size="lg"
                onClick={handleCreateRoom}
                loading={isCreating}
                loadingText="Creating..."
                disabled={!isConnected}
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                transition="all 0.2s"
              >
                Create New Room
              </Button>
              
              <Separator />
              
              <Field.Root>
                <Field.Label>Join Existing Room</Field.Label>
                <Stack direction="row">
                  <Input
                    placeholder="Enter room ID"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                    disabled={!isConnected}
                  />
                  <Button
                    colorScheme="green"
                    onClick={handleJoinRoom}
                    loading={isJoining}
                    disabled={!isConnected || !roomInput.trim()}
                  >
                    Join
                  </Button>
                </Stack>
              </Field.Root>
            </Stack>
        ) : (
            <Stack gap={4}>
              <Box
                p={4}
                borderRadius="md"
                bg="blue.50"
                borderWidth="1px"
                borderColor="blue.200"
              >
                <Text fontSize="sm" color="gray.600" mb={1}>Current Room</Text>
                <Stack direction="row" justify="space-between">
                  <Text fontFamily="mono" fontSize="lg" fontWeight="bold" color="blue.700">
                    {currentRoom}
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    onClick={copyRoomId}
                  >
                    Copy ID
                  </Button>
                </Stack>
              </Box>
              
              <Button
                colorScheme="red"
                variant="outline"
                onClick={handleLeaveRoom}
                _hover={{ bg: 'red.50' }}
              >
                Leave Room
              </Button>
            </Stack>
        )}
      </Stack>
    </Box>
  )
}

export function RoomManagerWithToaster() {
  return (
    <>
      <RoomManager />
      <Toaster toaster={toaster}>
        {(toast) => (
          <Box
            p={3}
            bg={toast.type === 'error' ? 'red.100' : toast.type === 'success' ? 'green.100' : 'blue.100'}
            borderRadius="md"
          >
            <Text fontWeight="medium">{toast.title}</Text>
            {toast.description && <Text fontSize="sm">{toast.description}</Text>}
          </Box>
        )}
      </Toaster>
    </>
  )
}