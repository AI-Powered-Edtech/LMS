import { AlertCircle, AlertTriangle, LogIn, RefreshCcw } from 'lucide-react'
import { Component, ErrorInfo, ReactNode } from 'react'

import { captureError } from '@/utils/sentry'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
  featureName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

/** Check whether the error is caused by a stale dynamic import (code-split chunk). */
function isChunkLoadError(error?: Error): boolean {
  if (!error) return false
  const msg = error.message || ''
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  )
}

/**
 * Detect context/provider errors — typically thrown when a component is
 * rendered outside its required React context provider.
 */
function isContextError(error?: Error): boolean {
  if (!error) return false
  const msg = error.message.toLowerCase()
  return (
    (msg.includes('must be used within') && msg.includes('provider')) ||
    (msg.includes('cannot read properties of null') &&
      (msg.includes('usecontext') || msg.includes('use'))) ||
    (msg.includes('cannot read properties of undefined') && msg.includes('use'))
  )
}

/**
 * Detect authentication/session-related errors from error message patterns.
 * Since this is a class component (can't use hooks), we inspect the error object.
 */
function isAuthError(error?: Error): boolean {
  if (!error) return false
  const msg = error.message.toLowerCase()
  const authPatterns = [
    'jwt',
    'jwt expired',
    'invalid claim',
    'auth session missing',
    'refresh_token_not_found',
    'invalid refresh token',
    'session_not_found',
    'not authenticated',
    'pgrst301',
  ]
  return authPatterns.some((pattern) => msg.includes(pattern))
}

/**
 * Feature-level ErrorBoundary for wrapping specific components (LessonViewer, QuizPlayer).
 * Shows a friendly error UI instead of a white screen when errors occur.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to Sentry — this was missing, so production crashes were unreported
    captureError(error, {
      context: 'FeatureErrorBoundary',
      featureName: this.props.featureName ?? 'unknown',
      componentStack: errorInfo.componentStack ?? '',
    })
    if (import.meta.env.DEV)
      console.error(`Error in ${this.props.featureName || 'halaman'}:`, error, errorInfo)
  }

  private handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry()
    } else {
      window.location.reload()
    }
  }

  public render() {
    const fn = this.props.featureName || 'halaman ini'
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Stale chunk / dynamic import failure — prompt user to refresh
      if (isChunkLoadError(this.state.error)) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] bg-slate-50 dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-900/30 h-full w-full">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 text-blue-500 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <RefreshCcw className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Versi baru tersedia
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Aplikasi telah diperbarui sejak terakhir Anda membuka halaman ini. Silakan muat ulang
              untuk melanjutkan.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Perbarui Halaman
            </button>
          </div>
        )
      }

      // Context/provider error — component mounted outside required provider
      if (isContextError(this.state.error)) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] bg-violet-50 dark:bg-violet-950/20 rounded-2xl border border-violet-100 dark:border-violet-900/30 h-full w-full">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Komponen tidak dapat dimuat
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Komponen ini dimuat di luar context yang diperlukan. Coba muat ulang halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Muat Ulang Halaman
            </button>
          </div>
        )
      }

      // Auth/session error — prompt user to re-login
      if (isAuthError(this.state.error)) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 transition-colors duration-300 h-full w-full">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Sesi Anda telah berakhir
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Silakan masuk kembali untuk melanjutkan menggunakan aplikasi.
            </p>
            <a
              href="/#/login"
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <LogIn className="w-4 h-4" />
              Masuk Kembali
            </a>
          </div>
        )
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] bg-slate-50 dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 h-full w-full">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Terjadi kesalahan pada {fn}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
            {import.meta.env.DEV
              ? this.state.error?.message || 'Terjadi kesalahan tidak terduga.'
              : `Maaf, terjadi kesalahan saat memuat ${fn}. Coba muat ulang atau coba lagi nanti.`}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Coba Muat Ulang
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
