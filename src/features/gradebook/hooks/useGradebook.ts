import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGradebookEntries, syncGradebook } from '../api/gradebookApi'

/**
 * Hook untuk mengambil entri gradebook per kursus.
 */
export function useGradebookData(courseId: string, tenantId: string) {
  return useQuery({
    queryKey: ['gradebook', courseId, tenantId],
    queryFn: () => fetchGradebookEntries(courseId, tenantId),
    enabled: !!courseId && !!tenantId,
  })
}

/**
 * Hook untuk sinkronisasi gradebook.
 */
export function useGradebookSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, tenantId }: { courseId: string; tenantId: string }) =>
      syncGradebook(courseId, tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gradebook'] }),
  })
}
