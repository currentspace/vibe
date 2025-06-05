'use client'

import { Box, Text } from '@chakra-ui/react'
import { useWebRTC } from '@/contexts/WebRTCContext'
import { Global } from '@emotion/react'

interface StatusIconProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
}

function StatusIcon({ status }: StatusIconProps) {
  const configs = {
    disconnected: {
      color: 'gray.500',
      animation: 'none',
    },
    connecting: {
      color: 'yellow.500',
      animation: `rotate 2s linear infinite`,
    },
    connected: {
      color: 'green.500',
      animation: `pulse 2s infinite`,
    },
    error: {
      color: 'red.500',
      animation: 'none',
    },
  }

  const config = configs[status]

  return (
    <Box
      as="span"
      display="inline-block"
      w="12px"
      h="12px"
      borderRadius="full"
      bg={config.color}
      animation={config.animation}
      mr={2}
    />
  )
}

const animationStyles = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.5);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(66, 153, 225, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(66, 153, 225, 0);
    }
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export function ConnectionStatus() {
  const { connectionStatus, error, currentRoom, participants } = useWebRTC()

  const statusText = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Connection Error',
  }

  return (
    <>
      <Global styles={animationStyles} />
      <Box
        p={4}
        borderWidth="1px"
        borderRadius="lg"
        borderColor="gray.200"
        bg="white"
        shadow="sm"
        animation={`fadeIn 0.5s ease-out`}
      >
      <Box display="flex" alignItems="center" mb={2}>
        <StatusIcon status={connectionStatus} />
        <Text fontWeight="semibold" fontSize="lg">
          {statusText[connectionStatus]}
        </Text>
      </Box>

      {error && (
        <Text color="red.500" fontSize="sm" mt={2}>
          {error}
        </Text>
      )}

      {currentRoom && (
        <Box mt={3} animation={`fadeIn 0.5s ease-out 0.2s both`}>
          <Text fontSize="sm" color="gray.600">
            Room ID: <Text as="span" fontFamily="mono" fontWeight="medium">{currentRoom}</Text>
          </Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Participants: {participants.length + 1}
          </Text>
        </Box>
      )}
      </Box>
    </>
  )
}