// ==========================================================================
// Quiz Player Service — quizPlayer.service.ts
//
// Student-facing API. Orchestration + data retrieval functions.
// Delegates attempt/submission to quizAttemptService.ts and
// timer/helpers to quizTimerService.ts.
// ==========================================================================

import { supabase } from '@/services/supabase/client'

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
  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts_v2')
    .select('question_manifest')
    .eq('id', attemptId)
    .single()

  if (attemptError) throw attemptError

  // Get all existing answers for this attempt
  const { data: answers, error: answersError } = await supabase
    .from('quiz_attempt_questions_v2')
    .select('attempt_id, question_id, student_answers, points_earned, is_correct')
    .eq('attempt_id', attemptId)

  if (answersError) throw answersError

  const manifest = attempt.question_manifest || []
  if (manifest.length === 0) return []

  // Fetch all questions in the manifest
  const { data: questions, error: questionError } = await supabase
    .from('quiz_questions')
    .select(
      `
      id,
      text,
      explanation,
      "order",
      question_type,
      points,
      quiz_options ( id, text )
    `
    )
    .in('id', manifest)

  if (questionError) throw questionError

  // Build Maps for O(1) lookup instead of O(n) find() - fixes O(n^2) performance
  const questionsMap = new Map<string, (typeof questions)[0]>()
  questions.forEach((q) => questionsMap.set(q.id, q))

  const answersMap = new Map<string, (typeof answers)[0]>()
  answers.forEach((a) => answersMap.set(a.question_id, a))

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
  tenantId: string
): Promise<StudentQuizAssignment[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Get student's enrolled classes
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('student_id', session.user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE')

  if (enrollmentError) throw enrollmentError

  const classIds = (enrollments || []).map((item) => item.class_id).filter(Boolean)
  if (classIds.length === 0) return []

  // Get quiz assignments for those classes
  const { data, error } = await supabase
    .from('quiz_assignments')
    .select(
      `
      id,
      quiz_id,
      class_id,
      status,
      available_from,
      due_at,
      classes!inner (
        id,
        name
      ),
      quizzes!inner (
        id,
        title,
        instructions,
        mode,
        time_limit_minutes,
        max_attempts,
        passing_score,
        show_correct_answers,
        status,
        available_from,
        available_until,
        quiz_questions ( id )
      )
    `
    )
    .eq('tenant_id', tenantId)
    .in('class_id', classIds)
    .eq('quizzes.status', 'published')
    .eq('status', 'active')
    .order('available_from', { ascending: true })
    .limit(100)

  if (error) throw error

  return (data || []).map((assignment) => {
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
export async function getUserAttempts(tenantId: string): Promise<QuizAttempt[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('quiz_attempts_v2')
    .select(
      `
      id,
      quiz_id,
      student_id,
      status,
      score,
      started_at,
      submitted_at,
      time_spent_seconds,
      question_manifest,
      final_answers,
      tenant_id,
      assignment_id,
      quizzes (
        title,
        passing_score,
        mode,
        show_correct_answers
      ),
      quiz_assignments:assignment_id (
        id,
        class_id,
        classes (
          id,
          name
        )
      )
    `
    )
    .eq('student_id', session.user.id)
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data || []) as unknown as QuizAttempt[]
}
