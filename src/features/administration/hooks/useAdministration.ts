import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { captureError } from '@/src/utils/sentry'

import { administrationService } from '../api/administrationService'

/**
 * Hook untuk mengambil daftar Administrasi.
 */
export function useAdministrationData() {
  return useQuery({
    queryKey: ['administration'],
    queryFn: () => administrationService.getTenantModules(),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Administrasi.
 */
export function useAdministrationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) =>
      administrationService.toggleTenantModule(moduleId, isEnabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['administration'] }),
    onError: (err) => {
      captureError(err, { context: 'useAdministrationMutation' })
    },
  })
}
