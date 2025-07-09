/**
 * ID generation utilities
 */

/**
 * Generate a random ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}

/**
 * Generate a room ID
 */
export function generateRoomId(): string {
  return generateId('room')
}

/**
 * Generate a user ID
 */
export function generateUserId(): string {
  return generateId('user')
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return generateId('session')
}

/**
 * Validate ID format
 */
export function isValidId(id: string, prefix?: string): boolean {
  if (!id || typeof id !== 'string') return false
  
  if (prefix) {
    const pattern = new RegExp(`^${prefix}-\\d{13}-[a-z0-9]{9}$`)
    return pattern.test(id)
  }
  
  const pattern = /^\d{13}-[a-z0-9]{9}$/
  return pattern.test(id)
}

/**
 * Extract timestamp from ID
 */
export function getTimestampFromId(id: string): number | null {
  const parts = id.split('-')
  const timestampPart = parts.length === 3 ? parts[1] : parts[0]
  const timestamp = parseInt(timestampPart, 10)
  
  return isNaN(timestamp) ? null : timestamp
}

/**
 * Get age of ID in milliseconds
 */
export function getIdAge(id: string): number | null {
  const timestamp = getTimestampFromId(id)
  return timestamp ? Date.now() - timestamp : null
}