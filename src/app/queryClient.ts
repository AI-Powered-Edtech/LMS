import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry client errors (400-499) — they are deterministically invalid
        // Exception: 429 Too Many Requests is transient, allow 1 retry
        const status = (error as any)?.status ?? (error as any)?.code;
        if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
          return false;
        }
        // For network errors and 5xx: retry once
        return failureCount < 1;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
