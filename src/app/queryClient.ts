import { QueryClient } from '@tanstack/react-query'

import { useToast } from '@/hooks/useToast'

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
      // Jangan retry client errors (400-499) — deterministically invalid
      // Kecuali 429 Too Many Requests (transient), boleh retry 1x
      retry: (failureCount, error) => {
        const status = getErrorStatus(error)
        if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
          return false
        }
        // Network errors dan 5xx: retry maksimal 2x
        return failureCount < 2
      },
      // Exponential backoff: 1s → 2s → 4s... max 10s
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
      // Data dianggap fresh selama 1 menit (turun dari 5 menit untuk data yang lebih aktual)
      staleTime: 60_000,
      // Garbage collection setelah 5 menit tidak digunakan
      gcTime: 5 * 60_000,
      // Tidak refetch aggressif saat window focus (hemat quota)
      refetchOnWindowFocus: false,
      // PWA support: queries berjalan saat offline dengan cache
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
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
