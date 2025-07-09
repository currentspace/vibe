/**
 * In-memory storage adapter
 * Used for development and simple deployments
 */

import { Room, Participant, StorageAdapter } from '@vibe/core'

export class MemoryStorageAdapter implements StorageAdapter {
  private rooms = new Map<string, Room>()

  async createRoom(roomId: string): Promise<Room> {
    const room: Room = {
      id: roomId,
      createdAt: new Date(),
      participants: new Map()
    }
    this.rooms.set(roomId, room)
    return room
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return this.rooms.get(roomId) || null
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId)
  }

  async addParticipant(roomId: string, participant: Participant): Promise<void> {
    const room = this.rooms.get(roomId)
    if (room) {
      room.participants.set(participant.id, participant)
    }
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    const room = this.rooms.get(roomId)
    if (room) {
      room.participants.delete(userId)
    }
  }

  async getRoomList(): Promise<string[]> {
    return Array.from(this.rooms.keys())
  }
}