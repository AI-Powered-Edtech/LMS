import { QueryClient } from '@tanstack/react-query'

import { useToast } from '@/src/hooks/useToast'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry client errors (400-499) — they are deterministically invalid
        // Exception: 429 Too Many Requests is transient, allow 1 retry
        const status =
          (error as unknown as { status?: number; code?: number })?.status ??
          (error as unknown as { status?: number; code?: number })?.code
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

// Global mutation error handler — catches unhandled mutation errors as a safety net
queryClient.getMutationCache().config.onError = (error: Error) => {
  useToast.getState().addToast({
    type: 'error',
    message: 'Terjadi kesalahan. Silakan coba lagi.',
    description: import.meta.env.DEV ? String(error) : undefined,
  })
}
