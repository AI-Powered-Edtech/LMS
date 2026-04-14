import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorFallback } from '@/src/components/ui/ErrorFallback'
import { logger } from '@/src/utils/logger'

/* ─── Types ───────────────────────────────────────────────────── */

export interface ErrorBoundaryProps {
  fallback?: ReactNode
  onReset?: () => void
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/* ─── Error Boundary (Class Component) ────────────────────────── */

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) logger.error('[ErrorBoundary] Caught error:', error)
    if (import.meta.env.DEV)
      logger.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          title="Terjadi Kesalahan"
          description="Maaf, terjadi kesalahan yang tidak terduga."
          onRetry={this.handleReset}
          showHomeLink
        />
      )
    }

    return this.props.children
  }
}
