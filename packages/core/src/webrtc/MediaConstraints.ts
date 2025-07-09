/**
 * WebRTC media constraints and utilities
 */

export interface VideoConstraints {
  width?: number | { min?: number; ideal?: number; max?: number }
  height?: number | { min?: number; ideal?: number; max?: number }
  frameRate?: number | { min?: number; ideal?: number; max?: number }
  facingMode?: 'user' | 'environment' | { exact: 'user' | 'environment' }
}

export interface AudioConstraints {
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  sampleRate?: number
  channelCount?: number
}

export interface MediaConstraints {
  video?: boolean | VideoConstraints
  audio?: boolean | AudioConstraints
}

export class MediaConstraintsBuilder {
  private constraints: MediaConstraints = {}

  /**
   * Enable/disable video
   */
  setVideo(enabled: boolean | VideoConstraints): this {
    this.constraints.video = enabled
    return this
  }

  /**
   * Enable/disable audio
   */
  setAudio(enabled: boolean | AudioConstraints): this {
    this.constraints.audio = enabled
    return this
  }

  /**
   * Set video quality preset
   */
  setVideoQuality(quality: 'low' | 'medium' | 'high' | '4k'): this {
    const presets = {
      low: { width: 320, height: 240, frameRate: 15 },
      medium: { width: 640, height: 480, frameRate: 30 },
      high: { width: 1280, height: 720, frameRate: 30 },
      '4k': { width: 3840, height: 2160, frameRate: 30 }
    }
    
    this.constraints.video = {
      ...presets[quality],
      ...(typeof this.constraints.video === 'object' ? this.constraints.video : {})
    }
    
    return this
  }

  /**
   * Set preferred camera
   */
  setCamera(facing: 'user' | 'environment'): this {
    if (typeof this.constraints.video === 'object') {
      this.constraints.video.facingMode = facing
    } else {
      this.constraints.video = { facingMode: facing }
    }
    return this
  }

  /**
   * Enable echo cancellation
   */
  setEchoCancellation(enabled: boolean): this {
    if (typeof this.constraints.audio === 'object') {
      this.constraints.audio.echoCancellation = enabled
    } else {
      this.constraints.audio = { echoCancellation: enabled }
    }
    return this
  }

  /**
   * Enable noise suppression
   */
  setNoiseSuppression(enabled: boolean): this {
    if (typeof this.constraints.audio === 'object') {
      this.constraints.audio.noiseSuppression = enabled
    } else {
      this.constraints.audio = { noiseSuppression: enabled }
    }
    return this
  }

  /**
   * Build the constraints object
   */
  build(): MediaConstraints {
    return { ...this.constraints }
  }

  /**
   * Get default constraints for video calls
   */
  static getDefault(): MediaConstraints {
    return new MediaConstraintsBuilder()
      .setVideo({
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      })
      .setAudio({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      })
      .build()
  }

  /**
   * Get mobile-optimized constraints
   */
  static getMobileOptimized(): MediaConstraints {
    return new MediaConstraintsBuilder()
      .setVideo({
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      })
      .setAudio({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      })
      .build()
  }

  /**
   * Get audio-only constraints
   */
  static getAudioOnly(): MediaConstraints {
    return new MediaConstraintsBuilder()
      .setVideo(false)
      .setAudio({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      })
      .build()
  }
}