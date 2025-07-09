/**
 * Hook for managing media streams
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { MediaConstraintsBuilder } from '@vibe/core'

export interface UseMediaStreamOptions {
  audio?: boolean
  video?: boolean
  constraints?: MediaStreamConstraints
  autoStart?: boolean
}

export function useMediaStream(options: UseMediaStreamOptions = {}) {
  const { 
    audio = true, 
    video = true, 
    constraints,
    autoStart = false 
  } = options
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(audio)
  const [videoEnabled, setVideoEnabled] = useState(video)
  
  const streamRef = useRef<MediaStream | null>(null)
  
  const startStream = useCallback(async () => {
    if (streamRef.current) {
      return streamRef.current
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const mediaConstraints = constraints || 
        new MediaConstraintsBuilder()
          .setAudio(audio)
          .setVideo(video)
          .build()
      
      const newStream = await window.navigator.mediaDevices.getUserMedia(mediaConstraints)
      streamRef.current = newStream
      setStream(newStream)
      
      // Set initial track states
      newStream.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled
      })
      newStream.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled
      })
      
      return newStream
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access media devices'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [audio, video, audioEnabled, videoEnabled, constraints])
  
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setStream(null)
    }
  }, [])
  
  const toggleAudio = useCallback((enabled?: boolean) => {
    const newState = enabled !== undefined ? enabled : !audioEnabled
    setAudioEnabled(newState)
    
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newState
      })
    }
  }, [audioEnabled])
  
  const toggleVideo = useCallback((enabled?: boolean) => {
    const newState = enabled !== undefined ? enabled : !videoEnabled
    setVideoEnabled(newState)
    
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = newState
      })
    }
  }, [videoEnabled])
  
  const replaceVideoTrack = useCallback(async (newConstraints: MediaStreamConstraints) => {
    if (!streamRef.current) {
      return startStream()
    }
    
    try {
      const newStream = await window.navigator.mediaDevices.getUserMedia(newConstraints)
      const oldVideoTrack = streamRef.current.getVideoTracks()[0]
      const newVideoTrack = newStream.getVideoTracks()[0]
      
      if (oldVideoTrack && newVideoTrack) {
        streamRef.current.removeTrack(oldVideoTrack)
        streamRef.current.addTrack(newVideoTrack)
        oldVideoTrack.stop()
      }
      
      // Stop other tracks from new stream
      newStream.getTracks().forEach(track => {
        if (track !== newVideoTrack) {
          track.stop()
        }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to replace video track'
      setError(message)
      throw err
    }
  }, [startStream])
  
  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startStream().catch(() => {
        // Error is already handled in startStream
      })
    }
    
    return () => {
      if (autoStart) {
        stopStream()
      }
    }
  }, [autoStart, startStream, stopStream])
  
  return {
    stream,
    isLoading,
    error,
    audioEnabled,
    videoEnabled,
    startStream,
    stopStream,
    toggleAudio,
    toggleVideo,
    replaceVideoTrack,
  }
}