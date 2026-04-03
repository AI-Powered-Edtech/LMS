import { createQueryKeys } from '@/shared/lib/queryKeys'

const base = createQueryKeys('quests')

export const questKeys = {
  ...base,
  /** Active quests with progress for a student */
  active: (tenantId: string) => [...base.all(tenantId), 'active'] as const,
  /** All quest definitions for teacher/admin management */
  definitions: (tenantId: string) => [...base.all(tenantId), 'definitions'] as const,
}
