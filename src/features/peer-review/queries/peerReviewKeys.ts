import { createQueryKeys } from '@/shared/lib/queryKeys'

export const peerReviewKeys = createQueryKeys('peer-reviews')

export const peerReviewQueryKeys = {
  ...peerReviewKeys,
  byAssignment: (tenantId: string, assignmentId: string) =>
    ['peer-reviews', tenantId, 'assignment', assignmentId] as const,
  myReviews: (tenantId: string, userId: string) =>
    ['peer-reviews', tenantId, 'my', userId] as const,
  bySubmission: (tenantId: string, submissionId: string) =>
    ['peer-reviews', tenantId, 'submission', submissionId] as const,
}
