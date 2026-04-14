import { QueryClient } from '@tanstack/react-query'

import { useToast } from '@/src/hooks/useToast'

/** Extract HTTP status from various error shapes returned by API/fetch. */
function getErrorStatus(error: unknown): number | undefined {
  const e = error as { status?: number; code?: number }
  return e?.status ?? e?.code
}

/** Check if an error is a network/connectivity failure (fetch rejected, no status). */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true
  const status = getErrorStatus(error)
  // No HTTP status at all typically means the request never reached the server
  return status === undefined && !(error instanceof Error && error.message.includes('JSON'))
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry client errors (400-499) — they are deterministically invalid
        // Exception: 429 Too Many Requests is transient, allow 1 retry
        const status = getErrorStatus(error)
        if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
          return false
        }
        // For network errors and 5xx: retry once
        return failureCount < 1
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

// Global query error handler — fires when a query exhausts retries
queryClient.getQueryCache().config.onError = (error: Error) => {
  const status = getErrorStatus(error)

  // Auth errors (401/403) — AuthContext handles redirect, don't double-toast
  if (status === 401 || status === 403) return

  if (isNetworkError(error)) {
    useToast.getState().addToast({
      type: 'error',
      message: 'Gagal terhubung ke server',
      description: import.meta.env.DEV ? String(error) : undefined,
    })
    return
  }

  // All other errors
  useToast.getState().addToast({
    type: 'error',
    message: 'Gagal memuat data',
    description: import.meta.env.DEV ? String(error) : undefined,
  })
}

// Global mutation error handler — catches unhandled mutation errors as a safety net
queryClient.getMutationCache().config.onError = (error: Error) => {
  useToast.getState().addToast({
    type: 'error',
    message: 'Terjadi kesalahan. Silakan coba lagi.',
    description: import.meta.env.DEV ? String(error) : undefined,
  })
}
