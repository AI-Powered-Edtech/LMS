/**
 * Video Transcoding Status Hook
 *
 * Polls the backend for video transcoding status and provides real-time updates.
 * Used to show progress bars and status indicators for uploaded videos.
 *
 * Features:
 * - Automatic polling (every 3 seconds)
 * - Progress tracking (0-100%)
 * - Status updates (pending → processing → completed/failed)
 * - HLS manifest URL when completed
 * - Automatic stop when completed or failed
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { getAuthToken } from '@/services/auth/vilSession'
import { logger } from '@/utils/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscodingStatus {
  videoId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progressPercent: number
  hlsManifestUrl?: string
  thumbnailUrl?: string
  durationSeconds?: number
  errorMessage?: string
}

export interface UseTranscodingStatusOptions {
  videoId?: string
  pollingInterval?: number // Default: 3000ms
  onCompleted?: (status: TranscodingStatus) => void
  onFailed?: (error: string) => void
}

// ─── API Base URL ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || ''

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useTranscodingStatus(options: UseTranscodingStatusOptions = {}) {
  const { videoId, pollingInterval = 3000, onCompleted, onFailed } = options

  const [status, setStatus] = useState<TranscodingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const videoIdRef = useRef(videoId)

  /**
   * Fetch transcoding status
   */
  const fetchStatus = useCallback(
    async (id: string) => {
      if (!id) return

      try {
        const token = await getAuthToken()
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await fetch(`${API_BASE}/api/v1/storage/transcode-status/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        const transcodingStatus: TranscodingStatus = result.data

        setStatus(transcodingStatus)

        // Handle completion
        if (transcodingStatus.status === 'completed') {
          stopPolling()
          onCompleted?.(transcodingStatus)
        }

        // Handle failure
        if (transcodingStatus.status === 'failed') {
          stopPolling()
          setError(transcodingStatus.errorMessage || 'Transcoding failed')
          onFailed?.(transcodingStatus.errorMessage || 'Transcoding failed')
        }
      } catch (err: any) {
        logger.error('[TranscodingStatus] Error fetching status:', err)
        setError(err.message || 'Failed to fetch transcoding status')
        stopPolling()
      } finally {
        setIsLoading(false)
      }
    },
    [onCompleted, onFailed]
  )

  /**
   * Start polling for status
   */
  const startPolling = useCallback(
    (id: string) => {
      videoIdRef.current = id
      setIsLoading(true)
      setError(null)

      // Initial fetch
      void fetchStatus(id)

      // Set up polling
      pollingRef.current = setInterval(() => {
        if (videoIdRef.current) {
          void fetchStatus(videoIdRef.current)
        }
      }, pollingInterval)
    },
    [fetchStatus, pollingInterval]
  )

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    stopPolling()
    setStatus(null)
    setIsLoading(false)
    setError(null)
    videoIdRef.current = undefined
  }, [stopPolling])

  // Auto-start polling when videoId changes
  useEffect(() => {
    if (videoId) {
      startPolling(videoId)
    } else {
      stopPolling()
    }

    // Cleanup on unmount
    return () => {
      stopPolling()
    }
  }, [videoId, startPolling, stopPolling])

  return {
    status,
    isLoading,
    error,
    isTranscoding: status?.status === 'pending' || status?.status === 'processing',
    isCompleted: status?.status === 'completed',
    isFailed: status?.status === 'failed',
    progress: status?.progressPercent || 0,
    hlsManifestUrl: status?.hlsManifestUrl,
    thumbnailUrl: status?.thumbnailUrl,
    duration: status?.durationSeconds,
    startPolling,
    stopPolling,
    reset,
  }
}

export default useTranscodingStatus
