/**
 * Room management utilities
 */

import type { Room, Participant } from '../types'

export class RoomManager {
  /**
   * Check if a room is empty
   */
  static isEmpty(room: Room): boolean {
    return room.participants.size === 0
  }

  /**
   * Get participant count
   */
  static getParticipantCount(room: Room): number {
    return room.participants.size
  }

  /**
   * Find participant by connection ID
   */
  static findParticipantByConnection(
    room: Room, 
    connectionId: string
  ): Participant | undefined {
    return Array.from(room.participants.values())
      .find(p => p.connectionId === connectionId)
  }

  /**
   * Get all participants except one
   */
  static getOtherParticipants(
    room: Room, 
    excludeUserId: string
  ): Participant[] {
    return Array.from(room.participants.values())
      .filter(p => p.id !== excludeUserId)
  }

  /**
   * Check if user is in room
   */
  static hasParticipant(room: Room, userId: string): boolean {
    return room.participants.has(userId)
  }

  /**
   * Create a new room
   */
  static createRoom(id: string): Room {
    return {
      id,
      createdAt: new Date(),
      participants: new Map()
    }
  }

  /**
   * Get room age in milliseconds
   */
  static getRoomAge(room: Room): number {
    return Date.now() - room.createdAt.getTime()
  }

  /**
   * Check if room is stale (older than specified duration)
   */
  static isStale(room: Room, maxAgeMs: number): boolean {
    return this.getRoomAge(room) > maxAgeMs
  }
}