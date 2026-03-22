import { useQuery } from '@tanstack/react-query'
import { administrationService } from '../api/administrationService'

export const administrationKeys = {
  all: () => ['administration', 'modules'] as const,
  syncHistory: () => ['administration', 'sync-history'] as const,
}

/**
 * Query hook untuk daftar modul tenant yang aktif.
 */
export function useAdministrationList() {
  return useQuery({
    queryKey: administrationKeys.all(),
    queryFn: () => administrationService.getTenantModules(),
  })
}
