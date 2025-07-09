/**
 * Server API route definitions
 */

export type CreateRoomRequest = Record<string, never>

export interface CreateRoomResponse {
  roomId: string
}

export interface GetRoomRequest {
  roomId: string
}

export interface GetRoomResponse {
  roomId: string
  createdAt: string
  participantCount: number
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  mode: string
  timestamp: string
}

export interface ErrorResponse {
  error: string
  message?: string
  statusCode?: number
}

export const API_ROUTES = {
  health: '/health',
  rooms: {
    create: '/api/rooms',
    get: (roomId: string) => `/api/rooms/${roomId}`,
  },
} as const