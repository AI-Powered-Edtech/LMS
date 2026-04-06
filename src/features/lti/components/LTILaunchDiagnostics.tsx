import React, { useState } from 'react'

import { AlertCircle, AlertTriangle, Copy, RefreshCw } from 'lucide-react'

import type { LTLError } from '../utils/ltiErrorHandler'
import { classifyLTLError } from '../utils/ltiErrorHandler'

export interface LTILaunchDiagnosticsProps {
  /** Raw error from LTI launch */
  error?: unknown
  /** LTI launch data for debugging */
  launchData?: Record<string, unknown>
  /** Callback to retry launch */
  onRetry?: () => void
  /** Whether retry is in progress */
  isRetrying?: boolean
}

/**
 * LTI Launch Diagnostics Panel
 *
 * Displays detailed diagnostic information for debugging LTI launch failures.
 * Only shown in development or to admins.
 */
export function LTILaunchDiagnostics({
  error,
  launchData,
  onRetry,
  isRetrying = false,
}: LTILaunchDiagnosticsProps): React.ReactElement {
  const [showDetails, setShowDetails] = useState(false)

  if (!error) return <div />

  const ltiError = classifyLTLError(error)

  const getSeverityIcon = (): React.ReactNode => {
    if (!ltiError.retryable) {
      return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
    }
    return <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
  }

  const copyDiagnostics = (): void => {
    const diagnosticData = {
      error: ltiError,
      launchData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }

    navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2)).catch(() => {
      // Silently fail
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Error Summary */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex-shrink-0">{getSeverityIcon()}</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Diagnosa Peluncuran LTI
          </h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{ltiError.message}</p>

          {/* Error Code Badge */}
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {ltiError.code}
            </span>
            {!ltiError.retryable && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                Tidak bisa di-retry
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex gap-2">
            {ltiError.retryable && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Meluncurkan...' : 'Coba Lagi'}
              </button>
            )}

            <button
              type="button"
              onClick={copyDiagnostics}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Copy className="h-4 w-4" />
              Salin Diagnosa
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {showDetails ? 'Sembunyikan Detail' : 'Tampilkan Detail'}
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Diagnostics */}
      {showDetails && (
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
            Detail Teknis
          </h4>

          {/* Error Details */}
          {ltiError.details && (
            <div className="mb-3">
              <h5 className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Error Details:
              </h5>
              <pre className="max-h-40 overflow-auto rounded bg-gray-900 p-2 text-xs text-gray-100 dark:bg-gray-950">
                {JSON.stringify(ltiError.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Launch Data */}
          {launchData && (
            <div>
              <h5 className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Launch Data:
              </h5>
              <pre className="max-h-60 overflow-auto rounded bg-gray-900 p-2 text-xs text-gray-100 dark:bg-gray-950">
                {JSON.stringify(launchData, null, 2)}
              </pre>
            </div>
          )}

          {/* Troubleshooting Tips */}
          <div className="mt-3 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
            <h5 className="mb-2 text-xs font-semibold text-blue-800 dark:text-blue-200">
              Tips Troubleshooting:
            </h5>
            <ul className="list-inside list-disc space-y-1 text-xs text-blue-700 dark:text-blue-300">
              <li>Pastikan platform LTI sudah terdaftar dengan benar</li>
              <li>Periksa konfigurasi JWKS URL</li>
              <li>Verifikasi Deployment ID cocok</li>
              <li>Pastikan timestamp tidak kadaluarsa (max 5 menit)</li>
              <li>Periksa koneksi jaringan antara platform dan EduSync</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
