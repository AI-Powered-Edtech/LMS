import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storageService } from '../api/storageService'

/**
 * Hook untuk mengambil daftar Penyimpanan.
 */
export function useStorageData() {
  return useQuery({
    queryKey: ['storage'],
    queryFn: async () => [] as unknown[],
    enabled: false,
  })
}

/**
 * Hook untuk membuat/mengupdate Penyimpanan.
 */
export function useStorageMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { file: File; opts: Parameters<typeof storageService.uploadFile>[1] }) =>
      storageService.uploadFile(params.file, params.opts),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storage'] }),
  })
}
