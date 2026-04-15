import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'

import { discussionService } from '../api/discussionService'

export const discussionKeys = {
  all: (tenantId: string) => ['discussions', tenantId] as const,
  detail: (tenantId: string, id: string) => ['discussions', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['discussions', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Diskusi.
 */
function useDiscussionList() {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: discussionKeys.all(tenantId!),
    queryFn: () => discussionService.fetchDiscussions({ tenantId: tenantId! }),
    enabled: !!tenantId,
  })
}
