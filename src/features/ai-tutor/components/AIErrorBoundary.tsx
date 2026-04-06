import React, { Component, ErrorInfo, ReactNode } from 'react'

import { AIErrorFallback } from '@/shared/components/AIErrorFallback'

export interface AIErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Optional fallback content when error occurs */
  fallback?: ReactNode
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Whether to show the default error fallback UI */
  showFallback?: boolean
}

export interface AIErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean
  /** The error that was caught */
  error: Error | null
  /** Error info from React */
  errorInfo: ErrorInfo | null
}

/**
 * AI Error Boundary Component
 *
 * Catches errors in AI feature components and displays user-friendly
 * error messages with retry functionality.
 */
export class AIErrorBoundary extends Component<AIErrorBoundaryProps, AIErrorBoundaryState> {
  constructor(props: AIErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): AIErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('[AI Error Boundary] Caught error:', error)
      console.error('[AI Error Boundary] Error info:', errorInfo)
    }

    // Call optional error callback
    this.props.onError?.(error, errorInfo)

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })
  }

  /**
   * Reset error state to allow retry
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Show default error fallback UI
      if (this.props.showFallback !== false) {
        return (
          <AIErrorFallback
            error={this.state.error?.message}
            errorCode={this.extractErrorCode(this.state.error)}
            onRetry={this.resetError}
          />
        )
      }

      // Render nothing if fallback is disabled
      return null
    }

    return this.props.children
  }

  /**
   * Extract error code from error message
   */
  private extractErrorCode(error: Error | null): string | undefined {
    if (!error?.message) return undefined

    // Try to extract error code from message
    const match = error.message.match(/\[([A-Z_]+)\]/)
    return match?.[1]
  }
}

/**
 * Higher-order component to add error boundary to a component
 */
export function withAIErrorBoundary<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <AIErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </AIErrorBoundary>
    )
  }
}
