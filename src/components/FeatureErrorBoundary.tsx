import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
  featureName: string
}

interface State {
  hasError: boolean
  error?: Error
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
    console.error(`Error in ${this.props.featureName}:`, error, errorInfo)
  }

  private handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry()
    } else {
      window.location.reload()
    }
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] bg-slate-50 rounded-2xl border border-red-100 h-full w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-500 border border-red-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Terjadi kesalahan pada {this.props.featureName}
          </h2>
          <p className="text-slate-500 mb-6 max-w-sm">
            Maaf, terjadi kesalahan saat memuat {this.props.featureName}. Coba muat ulang atau coba
            lagi nanti.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all"
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
