// Quiz Player Service - Student-facing API
// Extracted from quizService.ts for the Quiz Engine Refactor

import { supabase } from '../../../lib/supabase'
import type {
  StartQuizAttemptInput,
  SubmitAnswer,
  StartQuizAttemptResult,
  QuizAttemptResult,
  QuizAttemptQuestion,
  StudentQuizAssignment,
  QuizAttempt,
  QuestionType,
} from '../types/quizzes.types'

// ============================================
// Quiz Player Service
// ============================================

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
    console.error('Error starting quiz:', error)
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

  const normalizedAnswers = normalizeFinalAnswers(answers)

  const { data, error } = await supabase.rpc('v1_submit_quiz_attempt', {
    p_attempt_id: attemptId,
    p_final_answers: normalizedAnswers,
    p_telemetry_data: version ? { client_version: version } : {},
  })

  if (error) {
    console.error('Error submitting quiz:', error)
    throw new Error(error.message || 'Failed to submit quiz')
  }

  const result = data as QuizAttemptResult

  // Award XP if passed (fire-and-forget, don't block submit on XP award)
  if (result.passed && session?.user) {
    awardQuizXp(attemptId, session.user.id, result.score).catch((xpError) => {
      console.error('Failed to award quiz XP:', xpError)
    })
  }

  return result
}

/**
 * Batch save multiple answers (for autosave)
 */
export async function batchSaveAnswers(
  attemptId: string,
  answers: SubmitAnswer[]
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const _answeredAt = new Date().toISOString()

  const promises = answers.map((answer) =>
    supabase.rpc('v1_save_answer', {
      p_attempt_id: attemptId,
      p_question_id: answer.question_id,
      p_selected_option_ids: answer.selected_option_ids || [],
      p_text_answer: answer.text_answer || null,
    })
  )

  await Promise.all(promises)
  return true
}

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
    .select('*')
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

  // Build Maps for O(1) lookup instead of O(n) find() - fixes O(n²) performance
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
      (option: any, optionIndex: number) => ({
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
    console.error('Error recording cheating signal:', error)
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
    console.error('Heartbeat error:', error)
    return false
  }

  return !!data
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

  if (error) throw error

  return (data || []).map((assignment: any) => {
    const quiz = assignment.quizzes || {}
    return {
      id: assignment.id,
      assignment_id: assignment.id,
      quiz_id: assignment.quiz_id,
      class_id: assignment.class_id,
      class_name: assignment.classes?.name || 'Kelas',
      title: quiz.title || 'Kuis',
      instructions: quiz.instructions || null,
      mode: quiz.mode || 'graded',
      status: assignment.status,
      available_from: assignment.available_from ?? quiz.available_from ?? null,
      due_at: assignment.due_at ?? quiz.available_until ?? null,
      time_limit_minutes: quiz.time_limit_minutes ?? null,
      max_attempts: assignment.max_attempts ?? quiz.max_attempts ?? null,
      passing_score: quiz.passing_score ?? null,
      show_correct_answers: quiz.show_correct_answers ?? false,
      quiz_questions: quiz.quiz_questions || [],
      quizzes: quiz,
      classes: assignment.classes,
    }
  })
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
      *,
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

  if (error) throw error
  return (data || []) as QuizAttempt[]
}

// ============================================
// Helper Functions
// ============================================

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

function normalizeFinalAnswers(answers: SubmitAnswer[]) {
  return answers.map((answer) => ({
    question_id: answer.question_id,
    student_answers:
      answer.text_answer && answer.text_answer.trim().length > 0
        ? answer.text_answer.trim()
        : answer.selected_option_ids || [],
  }))
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
      console.error('Failed to fetch attempt for XP award:', attemptError)
      return
    }

    // Get quiz info to find passing_score and lesson_id
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('passing_score, lesson_id')
      .eq('id', attempt.quiz_id)
      .single()

    if (quizError || !quiz) {
      console.error('Failed to fetch quiz for XP award:', quizError)
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
    console.error('Error awarding quiz XP:', err)
  }
}
