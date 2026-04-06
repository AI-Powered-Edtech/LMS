import React from 'react'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'

export interface AIErrorFallbackProps {
  /** Error message to display */
  error?: string
  /** Error code for programmatic handling */
  errorCode?: string
  /** Whether the error is retryable */
  retryable?: boolean
  /** Callback to retry the failed operation */
  onRetry?: () => void
  /** Whether a retry is currently in progress */
  isRetrying?: boolean
  /** Optional fallback content to show instead of error */
  fallbackContent?: React.ReactNode
  /** Optional className for custom styling */
  className?: string
}

/**
 * AI Error Boundary Fallback Component
 *
 * Displayed when an AI service call fails. Provides user-friendly error messages
 * in Bahasa Indonesia and retry functionality.
 */
export function AIErrorFallback({
  error,
  errorCode,
  retryable = true,
  onRetry,
  isRetrying = false,
  fallbackContent,
  className = '',
}: AIErrorFallbackProps): React.ReactElement {
  // Determine icon based on error type
  const getErrorIcon = (): React.ReactNode => {
    if (errorCode === 'NETWORK_ERROR') {
      return <WifiOff className="h-8 w-8 text-red-500 dark:text-red-400" />
    }
    return <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400" />
  }

  // Get user-friendly error message
  const getErrorMessage = (): string => {
    if (error) return error

    switch (errorCode) {
      case 'RATE_LIMIT_MINUTE':
        return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.'
      case 'RATE_LIMIT_DAILY':
        return 'Batas harian penggunaan AI telah tercapai. Coba lagi besok.'
      case 'NETWORK_ERROR':
        return 'Koneksi internet terputus. Periksa koneksi Anda dan coba lagi.'
      case 'SERVICE_UNAVAILABLE':
        return 'Layanan AI sedang tidak tersedia. Silakan coba beberapa saat lagi.'
      case 'TIMEOUT':
        return 'Waktu permintaan habis. Server membutuhkan waktu lebih lama dari biasanya.'
      case 'UNAUTHORIZED':
        return 'Anda tidak memiliki akses ke fitur ini.'
      default:
        return 'Terjadi kesalahan pada layanan AI. Silakan coba lagi.'
    }
  }

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{getErrorIcon()}</div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
            Layanan AI Tidak Tersedia
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{getErrorMessage()}</p>

          {errorCode && import.meta.env.DEV && (
            <p className="mt-1 text-xs font-mono text-red-600 dark:text-red-400">
              Kode: {errorCode}
            </p>
          )}

          {/* Retry button */}
          {retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900/70"
              aria-label="Coba lagi"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isRetrying ? 'Mencoba...' : 'Coba Lagi'}
            </button>
          )}
        </div>
      </div>

      {/* Optional fallback content */}
      {fallbackContent && <div className="mt-4 border-t border-red-200 pt-4 dark:border-red-800">{fallbackContent}</div>}
    </div>
  )
}

/**
 * AI Loading State with retry indicator
 */
export function AILoadingState({
  message = 'AI sedang memproses...',
  className = '',
}: {
  message?: string
  className?: string
}): React.ReactElement {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent" />
      <span className="text-sm text-gray-600 dark:text-gray-300">{message}</span>
    </div>
  )
}

/**
 * AI Service Degraded Banner
 *
 * Shown at the top of AI features when the service is experiencing issues
 */
export function AIDegradedBanner({
  message = 'Layanan AI sedang mengalami gangguan. Beberapa fitur mungkin tidak berfungsi dengan baik.',
  className = '',
}: {
  message?: string
  className?: string
}): React.ReactElement {
  return (
    <div
      className={`rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
        <p className="text-sm text-amber-700 dark:text-amber-300">{message}</p>
      </div>
    </div>
  )
}
