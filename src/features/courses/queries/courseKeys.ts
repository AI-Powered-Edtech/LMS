import { createQueryKeys } from '@/src/shared/lib/queryKeys'

const base = createQueryKeys('courses')

export const courseKeys = {
  ...base,
  enrollment: (tenantId: string, courseId: string, userId: string) =>
    [...base.all(tenantId), 'enrollment', courseId, userId] as const,
}
