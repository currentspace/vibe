'use client'

import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Avatar, 
  Badge,
  keyframes,
  Collapse,
  useDisclosure,
  IconButton,
} from '@chakra-ui/react'
import { useWebRTC } from '@/contexts/WebRTCContext'
import { useEffect, useState } from 'react'

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const slideOut = keyframes`
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
`

const bounce = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`

interface ParticipantItemProps {
  participant: {
    id: string
    joinedAt: Date
  }
  isNew?: boolean
  index: number
}

function ParticipantItem({ participant, isNew, index }: ParticipantItemProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <Box
      p={3}
      borderRadius="md"
      bg="gray.50"
      borderWidth="1px"
      borderColor="gray.200"
      animation={`
        ${isNew ? slideIn : 'none'} 0.3s ease-out,
        ${isLeaving ? slideOut : 'none'} 0.3s ease-out forwards
      `}
      _hover={{ 
        bg: 'gray.100', 
        transform: 'translateX(4px)',
        borderColor: 'blue.300'
      }}
      transition="all 0.2s"
      style={{
        animationDelay: isNew ? `${index * 0.1}s` : '0s'
      }}
    >
      <HStack spacing={3}>
        <Avatar
          size="sm"
          name={participant.id}
          bg="blue.500"
          color="white"
          animation={isNew ? `${bounce} 0.5s ease-out ${index * 0.1 + 0.3}s` : 'none'}
        />
        <Box flex={1}>
          <Text fontWeight="medium" fontSize="sm">
            {participant.id}
          </Text>
          <Text fontSize="xs" color="gray.500">
            Joined {getTimeAgo(participant.joinedAt)}
          </Text>
        </Box>
        {isNew && (
          <Badge colorScheme="green" fontSize="xs" animation={`${slideIn} 0.5s ease-out`}>
            NEW
          </Badge>
        )}
      </HStack>
    </Box>
  )
}

export function ParticipantList() {
  const { participants, currentRoom } = useWebRTC()
  const [newParticipantIds, setNewParticipantIds] = useState<Set<string>>(new Set())
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })

  useEffect(() => {
    // Mark participants as new when they join
    const currentIds = new Set(participants.map(p => p.id))
    const newIds = new Set<string>()
    
    participants.forEach(p => {
      if (!newParticipantIds.has(p.id)) {
        newIds.add(p.id)
      }
    })

    if (newIds.size > 0) {
      setNewParticipantIds(prev => new Set([...prev, ...newIds]))
      
      // Remove "new" status after animation
      setTimeout(() => {
        setNewParticipantIds(prev => {
          const updated = new Set(prev)
          newIds.forEach(id => updated.delete(id))
          return updated
        })
      }, 3000)
    }
  }, [participants])

  if (!currentRoom) return null

  return (
    <Box
      p={6}
      borderWidth="1px"
      borderRadius="lg"
      borderColor="gray.200"
      bg="white"
      shadow="sm"
    >
      <HStack justify="space-between" mb={4}>
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            Participants
          </Text>
          <Badge colorScheme="blue" fontSize="sm">
            {participants.length + 1} online
          </Badge>
        </Box>
        <IconButton
          aria-label="Toggle participants"
          icon={
            <Box
              as="span"
              display="inline-block"
              transition="transform 0.2s"
              transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
            >
              ▼
            </Box>
          }
          size="sm"
          variant="ghost"
          onClick={onToggle}
        />
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <VStack spacing={2} align="stretch">
          {/* Current user */}
          <Box
            p={3}
            borderRadius="md"
            bg="blue.50"
            borderWidth="1px"
            borderColor="blue.200"
          >
            <HStack spacing={3}>
              <Avatar
                size="sm"
                bg="blue.600"
                icon={<Text fontSize="xs">YOU</Text>}
              />
              <Box flex={1}>
                <Text fontWeight="medium" fontSize="sm" color="blue.700">
                  You (Host)
                </Text>
              </Box>
            </HStack>
          </Box>

          {/* Other participants */}
          {participants.map((participant, index) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              isNew={newParticipantIds.has(participant.id)}
              index={index}
            />
          ))}

          {participants.length === 0 && (
            <Box
              p={8}
              textAlign="center"
              color="gray.500"
              fontStyle="italic"
            >
              <Text>Waiting for others to join...</Text>
              <Box
                mt={2}
                display="inline-block"
                animation={`${bounce} 2s ease-in-out infinite`}
              >
                👥
              </Box>
            </Box>
          )}
        </VStack>
      </Collapse>
    </Box>
  )
}