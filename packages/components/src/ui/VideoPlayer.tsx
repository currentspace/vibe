/**
 * Video player component for displaying media streams
 */

import { useEffect, useRef } from 'react'

export interface VideoPlayerProps {
  stream: MediaStream | null
  muted?: boolean
  className?: string
  label?: string
  mirror?: boolean
}

export function VideoPlayer({ 
  stream, 
  muted = false, 
  className = '', 
  label,
  mirror = false 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])
  
  if (!stream) {
    return (
      <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">No video stream</p>
        </div>
        {label && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {label}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
      />
      {label && (
        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {label}
        </div>
      )}
    </div>
  )
}