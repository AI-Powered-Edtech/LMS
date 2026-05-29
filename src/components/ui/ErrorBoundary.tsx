/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child component trees and displays a fallback UI.
 * Provides retry functionality and error reporting to Sentry.
 *
 * Features:
 * - Catches render errors, lifecycle errors, and constructor errors
 * - User-friendly error messages in Indonesian
 * - Retry button to attempt recovery
 * - Error reporting to Sentry (production)
 * - Detailed error info in development
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary
 *   fallback={<CustomErrorUI />}
 *   onRetry={() => window.location.reload()}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";
import { captureError } from "@/utils/sentry";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ─── Error Boundary Class Component ───────────────────────────────────────────

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to Sentry in production
    captureError(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
      tags: {
        component: "ErrorBoundary",
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      logger.error("ErrorBoundary caught error:", error);
      logger.error("Component stack:", errorInfo.componentStack);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

// ─── Default Error Fallback ───────────────────────────────────────────────────

interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  className?: string;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  onRetry,
  className,
}: DefaultErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center min-h-[200px] p-8",
        "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl",
        className,
      )}
    >
      {/* Error Icon */}
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>

      {/* Error Message */}
      <h2 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2 text-center">
        Terjadi Kesalahan
      </h2>
      <p className="text-sm text-red-700 dark:text-red-300 text-center max-w-md mb-4">
        Maaf, terjadi kesalahan saat memuat komponen ini. Silakan coba lagi atau
        hubungi dukungan jika masalah berlanjut.
      </p>

      {/* Retry Button */}
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
        aria-label="Coba lagi"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Coba Lagi</span>
      </button>

      {/* Error Details (Development Only) */}
      {isDevelopment && error && (
        <details className="mt-4 w-full max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-left">
          <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Detail Error (Development)
          </summary>
          <div className="space-y-2 text-xs font-mono text-red-600 dark:text-red-400 overflow-auto max-h-64">
            <div>
              <strong>Error:</strong>
              <pre className="mt-1 whitespace-pre-wrap">{error.message}</pre>
            </div>
            {errorInfo && (
              <div>
                <strong>Component Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Higher-Order Component (HOC) ─────────────────────────────────────────────

interface WithErrorBoundaryOptions {
  fallback?: ReactNode;
  onRetry?: () => void;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {},
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={options.fallback} onRetry={options.onRetry}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

