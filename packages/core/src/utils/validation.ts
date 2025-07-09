/**
 * Validation utilities
 */

/**
 * Validate room ID format
 */
export function isValidRoomId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  // Allow both generated format and custom format
  return /^room-\d{13}-[a-z0-9]{9}$/.test(id) || /^[a-zA-Z0-9-_]{4,50}$/.test(id)
}

/**
 * Validate user ID format
 */
export function isValidUserId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  // Allow both generated format and custom format
  return /^user-\d{13}-[a-z0-9]{9}$/.test(id) || /^[a-zA-Z0-9-_]{3,50}$/.test(id)
}

/**
 * Validate WebRTC offer/answer
 */
export function isValidSessionDescription(sdp: unknown): sdp is RTCSessionDescriptionInit {
  return (
    typeof sdp === 'object' &&
    sdp !== null &&
    'type' in sdp &&
    'sdp' in sdp &&
    typeof (sdp as any).type === 'string' &&
    typeof (sdp as any).sdp === 'string' &&
    ['offer', 'answer'].includes((sdp as any).type)
  )
}

/**
 * Validate ICE candidate
 */
export function isValidIceCandidate(candidate: unknown): candidate is RTCIceCandidateInit {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'candidate' in candidate &&
    typeof (candidate as any).candidate === 'string'
  )
}

/**
 * Sanitize user input for display
 */
export function sanitizeDisplayName(name: string): string {
  if (!name || typeof name !== 'string') return 'Anonymous'
  
  // Remove any HTML tags
  const stripped = name.replace(/<[^>]*>/g, '')
  
  // Limit length
  const trimmed = stripped.trim().substring(0, 50)
  
  // Remove any control characters
  const cleaned = trimmed.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
  
  return cleaned || 'Anonymous'
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate WebSocket URL
 */
export function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['ws:', 'wss:'].includes(parsed.protocol)
  } catch {
    return false
  }
}