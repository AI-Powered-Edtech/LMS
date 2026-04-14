import { createQueryKeys } from '@/shared/lib/queryKeys'

export const videoKeys = createQueryKeys('video-assets')

export const videoQueryKeys = {
  ...videoKeys,
  byBlock: (tenantId: string, blockId: string) =>
    ['video-assets', tenantId, 'block', blockId] as const,
  byLesson: (tenantId: string, lessonId: string) =>
    ['video-assets', tenantId, 'lesson', lessonId] as const,
}
