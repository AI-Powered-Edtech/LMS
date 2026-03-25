// ==========================================================================
// Quiz Timer Service — quizTimerService.ts
//
// Timer/heartbeat logic, cheating signal recording, and helper functions.
// Extracted from quizPlayer.service.ts for modularity.
// ==========================================================================

import { supabase } from '@/src/services/supabase/client'
import { logDevError } from '@/src/utils/logDevError'

import type { QuizAttemptQuestion, SubmitAnswer } from '../types/quizzes.types'

/**
 * Record a cheating signal (tab switch, etc.)
 */
export async function recordCheatingSignal(
  attemptId: string,
  signalType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.rpc('record_cheating_signal', {
    p_attempt_id: attemptId,
    p_signal_type: signalType,
    p_metadata: metadata,
  })

  if (error) {
    logDevError('quizPlayer', 'Error recording cheating signal:', error)
  }
}

/**
 * Record a heartbeat to indicate the quiz is still in progress
 */
export async function recordHeartbeat(attemptId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('record_quiz_heartbeat', {
    p_attempt_id: attemptId,
  })

  if (error) {
    logDevError('quizPlayer', 'Heartbeat error:', error)
    return false
  }

  return !!data
}

/**
 * Get the first unanswered question index for resume functionality.
 * Returns the index of the first question that has no answer recorded.
 * If all questions are answered, returns the last question index.
 */
export function getCurrentQuestionIndex(
  questions: QuizAttemptQuestion[],
  answers: Record<string, SubmitAnswer>
): number {
  if (!questions || questions.length === 0) return 0

  // Find first unanswered question
  const unansweredIdx = questions.findIndex((q) => {
    const answer = answers[q.question_id]
    const hasSelectedAnswer = answer?.selected_option_ids && answer.selected_option_ids.length > 0
    const hasTextAnswer = answer?.text_answer && answer.text_answer.trim().length > 0
    return !hasSelectedAnswer && !hasTextAnswer
  })

  // If all answered, return last question index, otherwise return first unanswered
  return unansweredIdx === -1 ? questions.length - 1 : unansweredIdx
}

/**
 * Normalize final answers for submission to the RPC.
 */
export function normalizeFinalAnswers(answers: SubmitAnswer[]) {
  return answers.map((answer) => ({
    question_id: answer.question_id,
    student_answers:
      answer.text_answer && answer.text_answer.trim().length > 0
        ? answer.text_answer.trim()
        : answer.selected_option_ids || [],
  }))
}
