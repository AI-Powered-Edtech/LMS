import { createQueryKeys } from '@/src/lib/queryKeys'

const base = createQueryKeys('announcements')

export const announcementKeys = {
  ...base,
  byCourse: (tenantId: string, courseId?: string) =>
    [...base.all(tenantId), 'course', courseId] as const,
}
