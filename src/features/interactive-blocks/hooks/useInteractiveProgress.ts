import { useCallback } from 'react'

import { useAuth } from '@/contexts/AuthContext'

import { useBlockProgress, useSaveBlockProgress } from '../queries/interactiveBlockQueries'

export function useInteractiveProgress(blockId: string, lessonId: string) {
  const { user, tenantId } = useAuth()
  const { data: progress } = useBlockProgress(blockId, user?.id, tenantId)
  const { mutate: saveProgress } = useSaveBlockProgress()

  const markComplete = useCallback(
    (interactionData: Record<string, unknown>, score?: number) => {
      if (!user?.id || !tenantId) return
      saveProgress({
        blockId,
        lessonId,
        interactionData,
        isCompleted: true,
        score,
        tenantId,
        userId: user.id,
      })
    },
    [blockId, lessonId, user?.id, tenantId, saveProgress]
  )

  const updateProgress = useCallback(
    (interactionData: Record<string, unknown>) => {
      if (!user?.id || !tenantId) return
      saveProgress({
        blockId,
        lessonId,
        interactionData,
        isCompleted: false,
        tenantId,
        userId: user.id,
      })
    },
    [blockId, lessonId, user?.id, tenantId, saveProgress]
  )

  return {
    progress,
    markComplete,
    updateProgress,
    isCompleted: progress?.is_completed ?? false,
  }
}
