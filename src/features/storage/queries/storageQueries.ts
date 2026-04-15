import { useQuery } from '@tanstack/react-query'

export const storageKeys = {
  all: (tenantId: string) => ['storage', tenantId] as const,
  detail: (tenantId: string, id: string) => ['storage', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['storage', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Penyimpanan.
 */
function useStorageList() {
  return useQuery({
    queryKey: ['storage'],
    queryFn: async () => [] as unknown[],
    enabled: false,
  })
}
