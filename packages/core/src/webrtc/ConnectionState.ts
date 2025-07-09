/**
 * WebRTC connection state management
 */

export enum ConnectionState {
  NEW = 'new',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  CLOSED = 'closed'
}

export interface ConnectionStateTransition {
  from: ConnectionState
  to: ConnectionState
  timestamp: Date
  reason?: string
}

export class ConnectionStateManager {
  private state: ConnectionState = ConnectionState.NEW
  private history: ConnectionStateTransition[] = []

  getState(): ConnectionState {
    return this.state
  }

  setState(newState: ConnectionState, reason?: string): void {
    const transition: ConnectionStateTransition = {
      from: this.state,
      to: newState,
      timestamp: new Date(),
      reason
    }
    
    this.history.push(transition)
    this.state = newState
  }

  getHistory(): ConnectionStateTransition[] {
    return [...this.history]
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED
  }

  canConnect(): boolean {
    return [
      ConnectionState.NEW,
      ConnectionState.DISCONNECTED,
      ConnectionState.FAILED
    ].includes(this.state)
  }

  reset(): void {
    this.state = ConnectionState.NEW
    this.history = []
  }
}