import { useMutation } from '@tanstack/react-query'
import { askTutor } from '../api/aiTutorService'

/**
 * Hook untuk berinteraksi dengan AI Tutor (mutation-based).
 */
export function useAITutorMutation() {
  return useMutation({
    mutationFn: (params: {
      lessonId: string
      question: string
      tenantId: string
      sessionId?: string
    }) => askTutor(params.lessonId, params.question, params.tenantId, params.sessionId),
  })
}
