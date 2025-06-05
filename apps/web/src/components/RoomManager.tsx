'use client'

import { useState } from 'react'
import { 
  Box, 
  VStack, 
  HStack, 
  Button, 
  Input, 
  Text, 
  useToast,
  FormControl,
  FormLabel,
  InputGroup,
  InputRightElement,
  IconButton,
  Divider,
  Fade,
  ScaleFade,
} from '@chakra-ui/react'
import { useWebRTC } from '@/contexts/WebRTCContext'

export function RoomManager() {
  const { createRoom, joinRoom, leaveRoom, currentRoom, isConnected } = useWebRTC()
  const [roomInput, setRoomInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const toast = useToast()

  const handleCreateRoom = async () => {
    if (!isConnected) {
      toast({
        title: 'Not connected',
        description: 'Please wait for the connection to establish',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    setIsCreating(true)
    try {
      const roomId = await createRoom()
      joinRoom(roomId)
      toast({
        title: 'Room created',
        description: `Room ID: ${roomId}`,
        status: 'success',
        duration: 5000,
      })
    } catch (error) {
      toast({
        title: 'Failed to create room',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = () => {
    if (!roomInput.trim()) {
      toast({
        title: 'Room ID required',
        description: 'Please enter a room ID',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    if (!isConnected) {
      toast({
        title: 'Not connected',
        description: 'Please wait for the connection to establish',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    setIsJoining(true)
    joinRoom(roomInput.trim())
    setRoomInput('')
    setTimeout(() => setIsJoining(false), 500)
  }

  const handleLeaveRoom = () => {
    leaveRoom()
    toast({
      title: 'Left room',
      status: 'info',
      duration: 2000,
    })
  }

  const copyRoomId = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom)
      toast({
        title: 'Room ID copied',
        status: 'success',
        duration: 2000,
      })
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
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold">Room Management</Text>
        
        {!currentRoom ? (
          <Fade in={!currentRoom}>
            <VStack spacing={4} align="stretch">
              <Button
                colorScheme="blue"
                size="lg"
                onClick={handleCreateRoom}
                isLoading={isCreating}
                loadingText="Creating..."
                isDisabled={!isConnected}
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                transition="all 0.2s"
              >
                Create New Room
              </Button>
              
              <Divider />
              
              <FormControl>
                <FormLabel>Join Existing Room</FormLabel>
                <HStack>
                  <Input
                    placeholder="Enter room ID"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                    isDisabled={!isConnected}
                  />
                  <Button
                    colorScheme="green"
                    onClick={handleJoinRoom}
                    isLoading={isJoining}
                    isDisabled={!isConnected || !roomInput.trim()}
                  >
                    Join
                  </Button>
                </HStack>
              </FormControl>
            </VStack>
          </Fade>
        ) : (
          <ScaleFade in={!!currentRoom} initialScale={0.9}>
            <VStack spacing={4} align="stretch">
              <Box
                p={4}
                borderRadius="md"
                bg="blue.50"
                borderWidth="1px"
                borderColor="blue.200"
              >
                <Text fontSize="sm" color="gray.600" mb={1}>Current Room</Text>
                <HStack justify="space-between">
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
                </HStack>
              </Box>
              
              <Button
                colorScheme="red"
                variant="outline"
                onClick={handleLeaveRoom}
                _hover={{ bg: 'red.50' }}
              >
                Leave Room
              </Button>
            </VStack>
          </ScaleFade>
        )}
      </VStack>
    </Box>
  )
}