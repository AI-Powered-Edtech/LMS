import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  })
}
