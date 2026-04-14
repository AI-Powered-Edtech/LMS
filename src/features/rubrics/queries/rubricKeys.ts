import { createQueryKeys } from '@/shared/lib/queryKeys'

export const rubricKeys = createQueryKeys('rubrics')

// Extended keys for rubric-specific query patterns
export const rubricQueryKeys = {
  ...rubricKeys,
  byAssignment: (tenantId: string, assignmentId: string) =>
    [rubricKeys.all(tenantId)[0], tenantId, 'assignment', assignmentId] as const,
  templates: (tenantId: string) => [rubricKeys.all(tenantId)[0], tenantId, 'templates'] as const,
  scores: (tenantId: string, submissionId: string) =>
    [rubricKeys.all(tenantId)[0], tenantId, 'scores', submissionId] as const,
}
