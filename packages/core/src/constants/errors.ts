/**
 * Error codes and messages
 */

export enum ErrorCode {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  
  // Room errors
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_ALREADY_JOINED = 'ROOM_ALREADY_JOINED',
  NOT_IN_ROOM = 'NOT_IN_ROOM',
  
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_USER_ID = 'INVALID_USER_ID',
  DUPLICATE_USER_ID = 'DUPLICATE_USER_ID',
  
  // Validation errors
  INVALID_ROOM_ID = 'INVALID_ROOM_ID',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  
  // Media errors
  MEDIA_ACCESS_DENIED = 'MEDIA_ACCESS_DENIED',
  MEDIA_NOT_SUPPORTED = 'MEDIA_NOT_SUPPORTED',
  MEDIA_DEVICE_NOT_FOUND = 'MEDIA_DEVICE_NOT_FOUND',
  
  // WebRTC errors
  PEER_CONNECTION_FAILED = 'PEER_CONNECTION_FAILED',
  ICE_CONNECTION_FAILED = 'ICE_CONNECTION_FAILED',
  SIGNALING_ERROR = 'SIGNALING_ERROR',
  
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Connection errors
  [ErrorCode.CONNECTION_FAILED]: 'Failed to establish connection',
  [ErrorCode.CONNECTION_TIMEOUT]: 'Connection timed out',
  [ErrorCode.CONNECTION_CLOSED]: 'Connection was closed',
  
  // Room errors
  [ErrorCode.ROOM_NOT_FOUND]: 'Room not found',
  [ErrorCode.ROOM_FULL]: 'Room is full',
  [ErrorCode.ROOM_ALREADY_JOINED]: 'Already joined this room',
  [ErrorCode.NOT_IN_ROOM]: 'You are not in this room',
  
  // User errors
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.INVALID_USER_ID]: 'Invalid user ID',
  [ErrorCode.DUPLICATE_USER_ID]: 'User ID already exists',
  
  // Validation errors
  [ErrorCode.INVALID_ROOM_ID]: 'Invalid room ID',
  [ErrorCode.INVALID_MESSAGE]: 'Invalid message format',
  [ErrorCode.MESSAGE_TOO_LARGE]: 'Message exceeds size limit',
  
  // Media errors
  [ErrorCode.MEDIA_ACCESS_DENIED]: 'Camera/microphone access denied',
  [ErrorCode.MEDIA_NOT_SUPPORTED]: 'Media not supported by browser',
  [ErrorCode.MEDIA_DEVICE_NOT_FOUND]: 'No camera or microphone found',
  
  // WebRTC errors
  [ErrorCode.PEER_CONNECTION_FAILED]: 'Failed to establish peer connection',
  [ErrorCode.ICE_CONNECTION_FAILED]: 'ICE connection failed',
  [ErrorCode.SIGNALING_ERROR]: 'Signaling error occurred',
  
  // General errors
  [ErrorCode.INTERNAL_ERROR]: 'Internal server error',
  [ErrorCode.NOT_IMPLEMENTED]: 'Feature not implemented',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
}

export class VibeError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: unknown
  ) {
    super(message || ERROR_MESSAGES[code])
    this.name = 'VibeError'
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}