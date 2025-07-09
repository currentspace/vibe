/**
 * Connection status indicator component
 */

import { ConnectionState } from '@vibe/core'

export interface ConnectionStatusProps {
  state: ConnectionState
  error?: string | null
  className?: string
}

export function ConnectionStatus({ state, error, className = '' }: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return 'green'
      case ConnectionState.CONNECTING:
        return 'yellow'
      case ConnectionState.FAILED:
      case ConnectionState.CLOSED:
        return 'red'
      default:
        return 'gray'
    }
  }
  
  const getStatusText = () => {
    switch (state) {
      case ConnectionState.NEW:
        return 'Not connected'
      case ConnectionState.CONNECTING:
        return 'Connecting...'
      case ConnectionState.CONNECTED:
        return 'Connected'
      case ConnectionState.DISCONNECTED:
        return 'Disconnected'
      case ConnectionState.FAILED:
        return error || 'Connection failed'
      case ConnectionState.CLOSED:
        return 'Connection closed'
      default:
        return 'Unknown'
    }
  }
  
  const color = getStatusColor()
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-sm">
        {getStatusText()}
      </span>
    </div>
  )
}