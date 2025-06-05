'use client'

import { 
  Box, 
  Stack, 
  Text, 
  Badge,
  Collapsible,
  IconButton,
  Avatar,
} from '@chakra-ui/react'
import { useWebRTC } from '@/contexts/WebRTCContext'
import { useEffect, useState } from 'react'
import { Global } from '@emotion/react'

const animationStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(20px);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
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
  const [isLeaving] = useState(false)
  const [timeAgo, setTimeAgo] = useState<string>('')
  
  useEffect(() => {
    const getTimeAgo = (date: Date) => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
      if (seconds < 60) return 'just now'
      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return `${minutes}m ago`
      const hours = Math.floor(minutes / 60)
      return `${hours}h ago`
    }
    
    setTimeAgo(getTimeAgo(participant.joinedAt))
    
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(participant.joinedAt))
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [participant.joinedAt])

  return (
    <Box
      p={3}
      borderRadius="md"
      bg="gray.50"
      borderWidth="1px"
      borderColor="gray.200"
      animation={`
        ${isNew ? 'slideIn' : 'none'} 0.3s ease-out,
        ${isLeaving ? 'slideOut' : 'none'} 0.3s ease-out forwards
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
      <Stack direction="row" gap={3}>
        <Avatar.Root
          size="sm"
          bg="blue.500"
          color="white"
          animation={isNew ? `bounce 0.5s ease-out ${index * 0.1 + 0.3}s` : 'none'}
        >
          <Avatar.Fallback>{participant.id.charAt(0).toUpperCase()}</Avatar.Fallback>
        </Avatar.Root>
        <Box flex={1}>
          <Text fontWeight="medium" fontSize="sm">
            {participant.id}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {timeAgo && `Joined ${timeAgo}`}
          </Text>
        </Box>
        {isNew && (
          <Badge colorScheme="green" fontSize="xs" animation={`slideIn 0.5s ease-out`}>
            NEW
          </Badge>
        )}
      </Stack>
    </Box>
  )
}

export function ParticipantList() {
  const { participants, currentRoom } = useWebRTC()
  const [newParticipantIds, setNewParticipantIds] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(true)
  
  const onToggle = () => setIsOpen(!isOpen)

  useEffect(() => {
    // Mark participants as new when they join
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
  }, [participants, newParticipantIds])

  if (!currentRoom) return null

  return (
    <>
      <Global styles={animationStyles} />
      <Box
        p={6}
        borderWidth="1px"
        borderRadius="lg"
        borderColor="gray.200"
        bg="white"
        shadow="sm"
      >
      <Stack direction="row" justify="space-between" mb={4}>
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
          size="sm"
          variant="ghost"
          onClick={onToggle}
        >
          <Box
            as="span"
            display="inline-block"
            transition="transform 0.2s"
            transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
          >
            ▼
          </Box>
        </IconButton>
      </Stack>

      <Collapsible.Root open={isOpen}>
        <Collapsible.Content>
        <Stack gap={2}>
          {/* Current user */}
          <Box
            p={3}
            borderRadius="md"
            bg="blue.50"
            borderWidth="1px"
            borderColor="blue.200"
          >
            <Stack direction="row" gap={3}>
              <Avatar.Root
                size="sm"
                bg="blue.600"
              >
                <Avatar.Fallback>
                  <Text fontSize="xs" color="white">YOU</Text>
                </Avatar.Fallback>
              </Avatar.Root>
              <Box flex={1}>
                <Text fontWeight="medium" fontSize="sm" color="blue.700">
                  You (Host)
                </Text>
              </Box>
            </Stack>
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
                animation={`bounce 2s ease-in-out infinite`}
              >
                👥
              </Box>
            </Box>
          )}
        </Stack>
        </Collapsible.Content>
      </Collapsible.Root>
      </Box>
    </>
  )
}