// Quiz Player Mutations - React Query mutations for student quiz flow
// Part of the Quiz Engine Refactor

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { captureError } from '@/utils/sentry'

import * as quizPlayerService from '../api/quizPlayer.service'
import type { StartQuizAttemptInput, SubmitAnswer } from '../types/quizzes.types'
import { QuizKeys } from './queryKeys'

// ============================================
// Mutation Hooks
// ============================================

/**
 * Start a new quiz attempt
 */
export function useStartQuizAttempt() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: StartQuizAttemptInput) => quizPlayerService.startQuizAttempt(input),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: QuizKeys.studentAssignments(tenantId) })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useStartQuizAttempt' })
      useToast.getState().addToast({
        type: 'error',
        message: 'Gagal memulai kuis. Silakan coba lagi.',
      })
    },
  })
}

/**
 * Submit a quiz attempt
 */
export function useSubmitQuizAttempt() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      attemptId,
      answers,
      version,
    }: {
      attemptId: string
      answers: SubmitAnswer[]
      version?: number
    }) => quizPlayerService.submitQuizAttempt(attemptId, answers, version),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: QuizKeys.userAttempts(tenantId) })
        queryClient.invalidateQueries({ queryKey: QuizKeys.studentAssignments(tenantId) })
      }
    },
    onError: (err, variables) => {
      captureError(err, { context: 'useSubmitQuizAttempt', attemptId: variables.attemptId })
      useToast.getState().addToast({
        type: 'error',
        message: 'Gagal mengirim jawaban kuis.',
        description: 'Jawaban Anda tersimpan lokal. Silakan coba lagi.',
      })
    },
  })
}
