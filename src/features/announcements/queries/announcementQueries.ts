import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementService } from '../api/announcementService'
import { announcementKeys } from './announcementKeys'
import { useAuth } from '../../../contexts/AuthContext'
import { Announcement } from '../types'

export function useAnnouncements(options?: {
  courseId?: string
  search?: string
  limit?: number
  offset?: number
  status?: 'draft' | 'published' | 'archived'
}) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: announcementKeys.list(tenantId!, options),
    queryFn: () => announcementService.fetchAnnouncements(tenantId!, options),
    enabled: !!tenantId,
  })
}

export function useSaveAnnouncement() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: (announcement: Partial<Announcement> & { created_by: string }) =>
      announcementService.saveAnnouncement({ ...announcement, tenant_id: tenantId! }),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: announcementKeys.all(tenantId) })
      }
    },
  })
}

export function useSubmitRSVP() {
  const queryClient = useQueryClient()
  const { tenantId, user } = useAuth()

  return useMutation({
    mutationFn: ({
      announcementId,
      response,
    }: {
      announcementId: string
      response: 'yes' | 'no' | 'maybe'
    }) => announcementService.submitRSVP(announcementId, tenantId!, user!.id, response),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: announcementKeys.all(tenantId) })
      }
    },
  })
}
