import React from 'react'

import { AlertTriangle, FileText, RefreshCw, WifiOff } from 'lucide-react'

import type { VideoError } from '../hooks/useVideoResilience'

export interface VideoFallbackHandlerProps {
  /** Current video error */
  error: VideoError | null
  /** Whether video is retrying */
  isRetrying: boolean
  /** Retry attempt count */
  retryCount: number
  /** Callback to retry */
  onRetry: () => void
  /** Transcript content to show as fallback */
  transcript?: string
  /** Transcript title */
  transcriptTitle?: string
}

/**
 * Video Fallback Handler Component
 *
 * Displays appropriate fallback UI when video playback fails,
 * including retry options and transcript fallback.
 */
export function VideoFallbackHandler({
  error,
  isRetrying,
  retryCount,
  onRetry,
  transcript,
  transcriptTitle = 'Transkrip Video',
}: VideoFallbackHandlerProps): React.ReactElement | null {
  if (!error) return null

  const getIcon = (): React.ReactNode => {
    if (error.type === 'NETWORK_ERROR' || error.type === 'CORS_ERROR') {
      return <WifiOff className="h-8 w-8 text-red-500 dark:text-red-400" />
    }
    return <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400" />
  }

  const getTroubleshootingTips = (): string[] => {
    switch (error.type) {
      case 'NETWORK_ERROR':
        return [
          'Periksa koneksi internet Anda',
          'Muat ulang halaman dan coba lagi',
          'Coba gunakan jaringan lain',
        ]
      case 'CORS_ERROR':
        return [
          'Video diblokir oleh kebijakan keamanan',
          'Hubungi administrator untuk mengakses video',
        ]
      case 'FORMAT_ERROR':
      case 'DECODE_ERROR':
        return [
          'Format video tidak didukung di browser Anda',
          'Coba gunakan browser lain (Chrome/Firefox)',
          'Update browser ke versi terbaru',
        ]
      case 'SRC_NOT_SUPPORTED':
        return [
          'Sumber video tidak tersedia',
          'Hubungi pengajar untuk mengakses video',
        ]
      default:
        return ['Coba muat ulang halaman', 'Hubungi administrator jika masalah berlanjut']
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4">
        {/* Error Message */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Video Tidak Dapat Diputar
            </h3>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{error.message}</p>

            {isRetrying && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Mencoba ulang... (percobaan {retryCount})
              </p>
            )}
          </div>
        </div>

        {/* Retry Button */}
        {error.retryable && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Mencoba...' : 'Coba Lagi'}
          </button>
        )}

        {/* Troubleshooting Tips */}
        <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
          <h4 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
            Tips Troubleshooting:
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-300">
            {getTroubleshootingTips().map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Transcript Fallback */}
        {transcript && (
          <div className="mt-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                const element = document.getElementById('video-transcript')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
            >
              <FileText className="h-4 w-4" />
              Lihat Transkrip Sebagai Pengganti
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Video Retry Indicator - Small badge showing retry status
 */
export function VideoRetryIndicator({
  retryCount,
  isRetrying,
}: {
  retryCount: number
  isRetrying: boolean
}): React.ReactElement | null {
  if (!isRetrying && retryCount === 0) return null

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
      {isRetrying ? `Mencoba ulang... (${retryCount})` : `Gagal ${retryCount}x`}
    </span>
  )
}
