import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { announcementService } from '../api/announcementService'

/**
 * Hook untuk mengambil daftar Pengumuman.
 */
export function useAnnouncementData(tenantId: string) {
  return useQuery({
    queryKey: ['announcements', tenantId],
    queryFn: () => announcementService.fetchAnnouncements(tenantId),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Pengumuman.
 */
export function useAnnouncementMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: announcementService.saveAnnouncement.bind(announcementService),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}
