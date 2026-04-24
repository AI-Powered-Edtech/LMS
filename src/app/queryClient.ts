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

/**
 * Normalize any error shape into a human-readable string.
 * Avoids rendering the dreaded "[object Object]" when an API/Supabase error
 * object is toast-described directly.
 */
function formatErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || error.name || 'Error'
  if (typeof error === 'object') {
    const e = error as {
      message?: string
      error?: string
      error_description?: string
      details?: string
      hint?: string
      statusText?: string
      status?: number
      code?: string | number
    }
    const msg =
      e.message ||
      e.error_description ||
      e.error ||
      e.details ||
      e.hint ||
      e.statusText
    if (msg) {
      return e.status ? `${e.status} ${msg}` : msg
    }
    try {
      const json = JSON.stringify(error)
      if (json && json !== '{}') return json
    } catch {
      /* fallthrough */
    }
  }
  return String(error)
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

/**
 * Dedup identical error toasts fired in quick succession (e.g. multiple queries
 * on a page all failing against the same data-plane). Without this, visiting a
 * screen with N failing queries produces N identical "Gagal memuat data" toasts.
 */
const recentErrorKeys = new Map<string, number>()
const ERROR_DEDUP_WINDOW_MS = 2_000
function shouldEmit(key: string): boolean {
  const now = Date.now()
  for (const [k, t] of recentErrorKeys) {
    if (now - t > ERROR_DEDUP_WINDOW_MS) recentErrorKeys.delete(k)
  }
  const last = recentErrorKeys.get(key)
  if (last && now - last < ERROR_DEDUP_WINDOW_MS) return false
  recentErrorKeys.set(key, now)
  return true
}

// Global query error handler — fires when a query exhausts retries
queryClient.getQueryCache().config.onError = (error: Error, query) => {
  // Respect per-query opt-out: set `meta: { suppressGlobalErrorToast: true }`
  // on useQuery for best-effort/background queries that have their own fallback UI.
  if (query?.meta && (query.meta as { suppressGlobalErrorToast?: boolean }).suppressGlobalErrorToast) return

  const status = getErrorStatus(error)

  // Auth errors (401/403) — AuthContext handles redirect, don't double-toast
  if (status === 401 || status === 403) return

  const detail = formatErrorMessage(error)

  if (isNetworkError(error)) {
    if (!shouldEmit(`net:${detail}`)) return
    useToast.getState().addToast({
      type: 'error',
      message: 'Gagal terhubung ke server',
      description: import.meta.env.DEV ? detail : undefined,
    })
    return
  }

  // All other errors
  if (!shouldEmit(`query:${detail}`)) return
  useToast.getState().addToast({
    type: 'error',
    message: 'Gagal memuat data',
    description: import.meta.env.DEV ? detail : undefined,
  })
}

// Global mutation error handler — catches unhandled mutation errors as a safety net
queryClient.getMutationCache().config.onError = (error: Error) => {
  const detail = formatErrorMessage(error)
  if (!shouldEmit(`mut:${detail}`)) return
  useToast.getState().addToast({
    type: 'error',
    message: 'Terjadi kesalahan. Silakan coba lagi.',
    description: import.meta.env.DEV ? detail : undefined,
  })
}
