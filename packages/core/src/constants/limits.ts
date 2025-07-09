/**
 * System limits and constraints
 */

export const LIMITS = {
  // Room limits
  MAX_PARTICIPANTS_PER_ROOM: 50,
  MAX_ROOM_NAME_LENGTH: 100,
  ROOM_ID_MIN_LENGTH: 4,
  ROOM_ID_MAX_LENGTH: 50,
  
  // User limits
  MAX_USERNAME_LENGTH: 50,
  MIN_USERNAME_LENGTH: 1,
  USER_ID_MIN_LENGTH: 3,
  USER_ID_MAX_LENGTH: 50,
  
  // Connection limits
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_MS: 1000,
  CONNECTION_TIMEOUT_MS: 30000,
  
  // Message limits
  MAX_MESSAGE_SIZE: 65536, // 64KB
  MAX_MESSAGES_PER_SECOND: 50,
  
  // Media constraints
  MAX_VIDEO_WIDTH: 3840,
  MAX_VIDEO_HEIGHT: 2160,
  MAX_FRAME_RATE: 60,
  MIN_FRAME_RATE: 1,
  
  // Room lifecycle
  ROOM_IDLE_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  ROOM_EMPTY_CLEANUP_DELAY_MS: 5 * 60 * 1000, // 5 minutes
} as const

export type Limits = typeof LIMITS