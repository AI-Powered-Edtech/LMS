/**
 * Video Playback Resilience Hook
 *
 * Provides automatic retry, quality auto-downgrade, and offline fallback
 * for video playback across the application.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface VideoResilienceConfig {
  /** Maximum retry attempts (default: 3) */
  maxRetries: number
  /** Initial retry delay in ms (default: 1000) */
  initialDelayMs: number
  /** Enable quality auto-downgrade (default: true) */
  enableAutoDowngrade: boolean
  /** Bandwidth threshold for downgrade in kbps (default: 500) */
  bandwidthThreshold: number
}

const DEFAULT_CONFIG: VideoResilienceConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  enableAutoDowngrade: true,
  bandwidthThreshold: 500,
}

export type VideoErrorType =
  | 'NETWORK_ERROR'
  | 'CORS_ERROR'
  | 'FORMAT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'DECODE_ERROR'
  | 'SRC_NOT_SUPPORTED'
  | 'UNKNOWN_ERROR'

export interface VideoError {
  type: VideoErrorType
  message: string
  retryable: boolean
}

/**
 * Classify video error from HTML5 video error or network error
 */
function classifyVideoError(error: MediaError | Event | null): VideoError {
  if (!error) {
    return {
      type: 'UNKNOWN_ERROR',
      message: 'Terjadi kesalahan pada pemutaran video',
      retryable: true,
    }
  }

  // HTML5 MediaError
  if ('code' in error) {
    const mediaError = error as MediaError
    switch (mediaError.code) {
      case MediaError.MEDIA_ERR_NETWORK:
        return {
          type: 'NETWORK_ERROR',
          message: 'Kesalahan jaringan. Memeriksa koneksi...',
          retryable: true,
        }
      case MediaError.MEDIA_ERR_DECODE:
        return {
          type: 'DECODE_ERROR',
          message: 'Video tidak dapat diputar. Mencoba format lain...',
          retryable: true,
        }
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return {
          type: 'SRC_NOT_SUPPORTED',
          message: 'Format video tidak didukung.',
          retryable: false,
        }
      default:
        return {
          type: 'UNKNOWN_ERROR',
          message: 'Terjadi kesalahan pada pemutaran video',
          retryable: true,
        }
    }
  }

  // Network/CORS error
  const message = 'message' in error ? (error as Error).message : ''
  if (message.includes('CORS') || message.includes('cors')) {
    return {
      type: 'CORS_ERROR',
      message: 'Video diblokir oleh kebijakan CORS. Hubungi administrator.',
      retryable: false,
    }
  }

  return {
    type: 'NETWORK_ERROR',
    message: 'Kesalahan jaringan. Memeriksa koneksi...',
    retryable: true,
  }
}

/**
 * Hook for resilient video playback with retry and fallback
 */
export function useVideoResilience(config?: Partial<VideoResilienceConfig>): {
  /** Current error state */
  error: VideoError | null
  /** Whether video is currently retrying */
  isRetrying: boolean
  /** Retry attempt count */
  retryCount: number
  /** Whether fallback (transcript) should be shown */
  showFallback: boolean
  /** Manual retry function */
  retry: () => void
  /** Reset error state */
  reset: () => void
  /** Report error from video element */
  reportError: (error: MediaError | Event | null) => void
  /** Report successful playback */
  reportSuccess: () => void
} {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config }
  const [error, setError] = useState<VideoError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const retryTimerRef = useRef<number | null>(null)
  const consecutiveErrorsRef = useRef(0)

  const reportError = useCallback(
    (mediaError: MediaError | Event | null) => {
      const videoError = classifyVideoError(mediaError)
      consecutiveErrorsRef.current += 1

      if (import.meta.env.DEV) {
        console.warn('[Video Resilience] Error detected:', videoError)
      }

      // If not retryable, show error immediately
      if (!videoError.retryable) {
        setError(videoError)
        setShowFallback(true)
        return
      }

      // If max retries exceeded, show fallback
      if (consecutiveErrorsRef.current > resolvedConfig.maxRetries) {
        setError(videoError)
        setShowFallback(true)
        return
      }

      // Start retry process
      setError(videoError)
      setIsRetrying(true)
      setRetryCount(consecutiveErrorsRef.current)

      const delayMs = resolvedConfig.initialDelayMs * Math.pow(2, consecutiveErrorsRef.current - 1)

      if (import.meta.env.DEV) {
        console.log(`[Video Resilience] Retrying in ${delayMs}ms... (attempt ${consecutiveErrorsRef.current})`)
      }

      retryTimerRef.current = window.setTimeout(() => {
        setIsRetrying(false)
        setError(null)
      }, delayMs)
    },
    [resolvedConfig]
  )

  const reportSuccess = useCallback(() => {
    consecutiveErrorsRef.current = 0
    setError(null)
    setIsRetrying(false)
    setRetryCount(0)
    setShowFallback(false)

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const retry = useCallback(() => {
    consecutiveErrorsRef.current = 0
    setError(null)
    setIsRetrying(false)
    setRetryCount(0)
    setShowFallback(false)

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    consecutiveErrorsRef.current = 0
    setError(null)
    setIsRetrying(false)
    setRetryCount(0)
    setShowFallback(false)

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
    }
  }, [])

  return {
    error,
    isRetrying,
    retryCount,
    showFallback,
    retry,
    reset,
    reportError,
    reportSuccess,
  }
}

/**
 * Hook to detect bandwidth and suggest quality level
 */
export function useBandwidthDetection(): {
  /** Estimated bandwidth in kbps */
  bandwidth: number | null
  /** Suggested quality level */
  suggestedQuality: 'auto' | '1080p' | '720p' | '480p' | '360p'
} {
  const [bandwidth, setBandwidth] = useState<number | null>(null)

  useEffect(() => {
    // Use Network Information API if available
    const connection = (navigator as any).connection
    if (connection) {
      const updateBandwidth = (): void => {
        if (connection.downlink) {
          // downlink is in Mbps, convert to kbps
          setBandwidth(Math.round(connection.downlink * 1000))
        }
      }

      updateBandwidth()
      connection.addEventListener('change', updateBandwidth)

      return () => {
        connection.removeEventListener('change', updateBandwidth)
      }
    }
  }, [])

  // Suggest quality based on bandwidth
  const suggestedQuality = (() => {
    if (!bandwidth) return 'auto'
    if (bandwidth >= 5000) return '1080p'
    if (bandwidth >= 2500) return '720p'
    if (bandwidth >= 1000) return '480p'
    return '360p'
  })()

  return { bandwidth, suggestedQuality }
}
