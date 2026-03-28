import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Component, ErrorInfo, ReactNode } from 'react'

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
