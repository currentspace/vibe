/**
 * Participant list component
 */

import type { Participant } from '@vibe/core'

export interface ParticipantListProps {
  participants: Participant[]
  localUserId?: string | null
  className?: string
}

export function ParticipantList({ 
  participants, 
  localUserId,
  className = '' 
}: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        No other participants
      </div>
    )
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-1">
        {participants.map((participant) => (
          <li 
            key={participant.id}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>
              {participant.id}
              {participant.id === localUserId && ' (You)'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}