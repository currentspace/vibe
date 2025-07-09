/**
 * Shared API configuration
 */

export const DEFAULT_SIGNALING_PORT = 4000
export const DEFAULT_SIGNALING_HOST = 'localhost'

export interface SignalingConfig {
  host: string
  port: number
  secure: boolean
}

export function getSignalingUrl(config: Partial<SignalingConfig> = {}): string {
  const {
    host = DEFAULT_SIGNALING_HOST,
    port = DEFAULT_SIGNALING_PORT,
    secure = false,
  } = config

  const protocol = secure ? 'https' : 'http'
  return `${protocol}://${host}:${port}`
}

export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Room events
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_JOINED: 'room-joined',
  ROOM_PARTICIPANTS: 'room-participants',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  
  // WebRTC signaling events
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
} as const