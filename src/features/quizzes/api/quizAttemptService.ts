// ==========================================================================
// Quiz Attempt Service — quizAttemptService.ts
//
// Attempt creation, submission, scoring, and XP award logic.
// Extracted from quizPlayer.service.ts for modularity.
// ==========================================================================

import { supabase } from '@/services/supabase/client'
import { logDevError } from '@/utils/logDevError'

import type {
  QuizAttemptResult,
  StartQuizAttemptInput,
  StartQuizAttemptResult,
  SubmitAnswer,
} from '../types/quizzes.types'
import { normalizeFinalAnswers } from './quizTimerService'

/**
 * Start a new quiz attempt or recover an existing one
 */
export async function startQuizAttempt(
  input: StartQuizAttemptInput
): Promise<StartQuizAttemptResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const quizId = typeof input === 'string' ? input : input.quizId
  const assignmentId = typeof input === 'string' ? null : (input.assignmentId ?? null)

  const { data, error } = await supabase.rpc('v1_start_quiz_attempt', {
    p_quiz_id: quizId,
    p_assignment_id: assignmentId,
  })

  if (error) {
    logDevError('quizPlayer', 'Error starting quiz:', error)
    throw new Error(error.message || 'Failed to start quiz')
  }

  return data as StartQuizAttemptResult
}

/**
 * Submit a quiz attempt with all answers
 */
export async function submitQuizAttempt(
  attemptId: string,
  answers: SubmitAnswer[],
  version?: number
): Promise<QuizAttemptResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // SERVER-SIDE RATE LIMITING
  // TODO: Phase 6 — check-rate-limit adalah internal service.
  // Saat VIL mengimplementasi /api/v1/rate-limit, aktifkan kembali server-side check.
  // Sementara, client-side rate limiting (via rateLimiter.ts) menjadi primary defense.
  // const limitData = await checkVilRateLimit('quiz-submit', session.user.id, 10, 60000)

  const normalizedAnswers = normalizeFinalAnswers(answers)

  const { data, error } = await supabase.rpc('v1_submit_quiz_attempt', {
    p_attempt_id: attemptId,
    p_final_answers: normalizedAnswers,
    p_telemetry_data: version ? { client_version: version } : {},
  })

  if (error) {
    logDevError('quizPlayer', 'Error submitting quiz:', error)
    throw new Error(error.message || 'Failed to submit quiz')
  }

  const result = data as QuizAttemptResult

  // Award XP if passed (fire-and-forget, don't block submit on XP award)
  if (result.passed && session?.user) {
    awardQuizXp(attemptId, session.user.id, result.score).catch((xpError) => {
      logDevError('quizPlayer', 'Failed to award quiz XP:', xpError)
    })
  }

  return result
}

/**
 * Batch save multiple answers (for autosave)
 * Uses a single RPC call instead of N separate calls.
 */
export async function batchSaveAnswers(
  attemptId: string,
  answers: SubmitAnswer[]
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase.rpc('batch_save_answers', {
    p_attempt_id: attemptId,
    p_answers: answers.map((a) => ({
      question_id: a.question_id,
      selected_option_ids: a.selected_option_ids || [],
      text_answer: a.text_answer || null,
    })),
  })

  if (error) throw error
  return true
}

/**
 * Award XP for passing a quiz (fire-and-forget)
 * Called after successful quiz submission when student passes
 */
async function awardQuizXp(attemptId: string, userId: string, score: number): Promise<void> {
  try {
    // Get attempt info to find quiz_id and tenant_id
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts_v2')
      .select('quiz_id, tenant_id, student_id')
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      logDevError('quizPlayer', 'Failed to fetch attempt for XP award:', attemptError)
      return
    }

    // Get quiz info to find passing_score and lesson_id
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('passing_score, lesson_id')
      .eq('id', attempt.quiz_id)
      .single()

    if (quizError || !quiz) {
      logDevError('quizPlayer', 'Failed to fetch quiz for XP award:', quizError)
      return
    }

    const passingScore = quiz.passing_score ?? 0
    const lessonId = quiz.lesson_id

    // Only award XP if score meets passing threshold
    if (score >= passingScore && lessonId) {
      await supabase.rpc('award_quiz_xp', {
        p_user_id: userId,
        p_lesson_id: lessonId,
        p_quiz_id: attempt.quiz_id,
        p_score: score,
        p_passing_score: passingScore,
        p_tenant_id: attempt.tenant_id,
      })
    }
  } catch (err) {
    // Log failure but don't throw - this is fire-and-forget
    logDevError('quizPlayer', 'Error awarding quiz XP:', err)
  }
}
