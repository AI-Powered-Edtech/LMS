import { useQuery } from '@tanstack/react-query'
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
export function useDiscussionList() {
  return useQuery({
    queryKey: ['discussions'],
    queryFn: () => discussionService.fetchDiscussions({}),
    enabled: true,
  })
}
