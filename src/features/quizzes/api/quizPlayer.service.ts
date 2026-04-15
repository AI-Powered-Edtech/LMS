// ==========================================================================
// Quiz Player Service — quizPlayer.service.ts
//
// Student-facing API. Orchestration + data retrieval functions.
// Delegates attempt/submission to quizAttemptService.ts and
// timer/helpers to quizTimerService.ts.
// ==========================================================================

import { apiFetch } from '@/src/lib/api'

import type {
  QuestionType,
  QuizAttempt,
  QuizAttemptQuestion,
  StudentQuizAssignment,
} from '../types/quizzes.types'

// Re-export everything from submodules for backward compatibility
export { batchSaveAnswers, startQuizAttempt, submitQuizAttempt } from './quizAttemptService'
export { getCurrentQuestionIndex, recordCheatingSignal, recordHeartbeat } from './quizTimerService'

/**
 * Get all questions for an attempt with current answers
 */
export async function getAttemptQuestions(attemptId: string): Promise<QuizAttemptQuestion[]> {
  // Get the question manifest from the attempt
  const { data: attempt, error: attemptError } = await apiFetch('/quiz_attempts_v2')

  if (attemptError) throw attemptError

  // Get all existing answers for this attempt
  const { data: answers, error: answersError } = await apiFetch('/quiz_attempt_questions_v2')

  if (answersError) throw answersError

  const manifest = attempt.question_manifest || []
  if (manifest.length === 0) return []

  // Fetch all questions in the manifest
  const { data: questions, error: questionError } = await apiFetch('/quiz_questions')

  if (questionError) throw questionError

  // Build Maps for O(1) lookup instead of O(n) find() - fixes O(n^2) performance
  const questionsArr = (questions ?? []) as any[]
  const questionsMap = new Map<string, any>()
  questionsArr.forEach((q: any) => questionsMap.set(q.id, q))

  const answersArr = (answers ?? []) as any[]
  const answersMap = new Map<string, any>()
  answersArr.forEach((a: any) => answersMap.set(a.question_id, a))

  // Map and normalize the data
  return manifest.map((questionId: string, index: number) => {
    const question = questionsMap.get(questionId)
    const answer = answersMap.get(questionId)

    let selectedOptionIds: string[] = []
    let textAnswer: string | null = null

    if (answer?.student_answers) {
      if (Array.isArray(answer.student_answers)) {
        selectedOptionIds = answer.student_answers as string[]
      } else if (typeof answer.student_answers === 'string') {
        textAnswer = answer.student_answers
      }
    }

    // Normalize quiz_options for the UI
    const normalizedOptions = (question?.quiz_options || []).map(
      (option: { id: string; text: string; order?: number }, optionIndex: number) => ({
        id: option.id,
        text: option.text,
        order: option.order || optionIndex,
      })
    )

    return {
      id: answer?.attempt_id ? `${answer.attempt_id}-${questionId}` : `${attemptId}-${questionId}`,
      question_id: questionId,
      text: question?.text || '',
      explanation: question?.explanation || null,
      order_index: index,
      question_type: (question?.question_type as QuestionType) || 'MCQ',
      max_points: question?.points || 0,
      selected_option_id: selectedOptionIds.length === 1 ? selectedOptionIds[0] : null,
      selected_option_ids: selectedOptionIds,
      text_answer: textAnswer,
      points_earned: answer?.points_earned || null,
      is_correct: answer?.is_correct ?? null,
      grader_comment: null,
      graded_by: null,
      graded_at: null,
      quiz_options: normalizedOptions,
      question_snapshot: {
        question_id: questionId,
        text: question?.text || '',
        question_type: (question?.question_type as QuestionType) || 'MCQ',
        points: question?.points || 0,
        explanation: question?.explanation || null,
        options: normalizedOptions,
      },
    } satisfies QuizAttemptQuestion
  })
}

/**
 * Get all quiz assignments for the current student
 */
export async function getStudentQuizAssignments(
  _tenantId: string
): Promise<StudentQuizAssignment[]> {
  const session = { user: { id: 'mock' } }
  if (!session) throw new Error('Not authenticated')

  // Get student's enrolled classes
  const { data: enrollments, error: enrollmentError } = await apiFetch('/enrollments')

  if (enrollmentError) throw enrollmentError

  const classIds = (enrollments || []).map((item: any) => item.class_id).filter(Boolean)
  if (classIds.length === 0) return []

  // Get quiz assignments for those classes
  const { data, error } = await apiFetch('/quiz_assignments')

  if (error) throw error

  return (data || []).map((assignment: any) => {
    const quizArr = assignment.quizzes as unknown
    const quiz = ((Array.isArray(quizArr) ? quizArr[0] : quizArr) as Record<string, unknown>) || {}
    const classArr = assignment.classes as unknown
    const cls = (Array.isArray(classArr) ? classArr[0] : classArr) as { name?: string } | null
    return {
      id: assignment.id,
      assignment_id: assignment.id,
      quiz_id: assignment.quiz_id,
      class_id: assignment.class_id,
      class_name: cls?.name || 'Kelas',
      title: quiz.title || 'Kuis',
      instructions: quiz.instructions || null,
      mode: quiz.mode || 'graded',
      status: assignment.status,
      available_from: assignment.available_from ?? quiz.available_from ?? null,
      due_at: assignment.due_at ?? quiz.available_until ?? null,
      time_limit_minutes: quiz.time_limit_minutes ?? null,
      max_attempts:
        (assignment as unknown as { max_attempts?: number }).max_attempts ??
        quiz.max_attempts ??
        null,
      passing_score: quiz.passing_score ?? null,
      show_correct_answers: quiz.show_correct_answers ?? false,
      quiz_questions: quiz.quiz_questions || [],
      quizzes: quiz,
      classes: cls,
    }
  }) as unknown as StudentQuizAssignment[]
}

/**
 * Get all attempts for the current user
 */
export async function getUserAttempts(_tenantId: string): Promise<QuizAttempt[]> {
  const session = { user: { id: 'mock' } }
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await apiFetch('/quiz_attempts_v2')

  if (error) throw error
  return (data || []) as unknown as QuizAttempt[]
}
