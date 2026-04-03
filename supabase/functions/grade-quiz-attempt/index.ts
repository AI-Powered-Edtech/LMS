import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: grade-quiz-attempt
// ==========================================================================
// Worker that processes pending quiz submissions.
// Checks out a ticket using FOR UPDATE SKIP LOCKED, grades the attempt locally,
// and updates the database via bulk upsert.
//
// Wave 1A: Bug fixes — correct table names, composite PK match, subjective skip.
// Wave 2B: Retry logic + circuit breaker.

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

const MAX_RETRIES = 3
const BACKOFF_MS = [30_000, 120_000, 600_000] // 30s, 2m, 10m

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface QueueTicket {
  ticket_id: string
  attempt_id: string
  tenant_id: string
  retry_count: number
}

interface AttemptQuestion {
  attempt_id: string
  started_at: string
  question_id: string
  student_answers: string[] | string | null
  points_earned: number | null
  is_correct: boolean | null
}

interface QuizOption {
  id: string
  is_correct: boolean
}

interface QuizQuestion {
  id: string
  points: number
  question_type: string
  quiz_options: QuizOption[]
}

interface GradedQuestion {
  attempt_id: string
  started_at: string
  question_id: string
  is_correct: boolean
  points_earned: number
}

type ObjectiveQuestionType = 'MULTIPLE_CHOICE' | 'MULTI_SELECT' | 'TRUE_FALSE'
type SubjectiveQuestionType = 'ESSAY' | 'SHORT_ANSWER'
type QuestionType = ObjectiveQuestionType | SubjectiveQuestionType | string

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
  })
}

/**
 * Returns true for question types that require manual grading and
 * should be skipped during auto-grading.
 */
function isSubjectiveType(questionType: QuestionType): boolean {
  return questionType === 'ESSAY' || questionType === 'SHORT_ANSWER'
}

/**
 * Pure grading function for a single objective question.
 * Returns null for subjective types (skip auto-grading).
 */
function gradeQuestion(aq: AttemptQuestion, questionDef: QuizQuestion): GradedQuestion | null {
  // Skip ESSAY / SHORT_ANSWER — must be graded manually
  if (isSubjectiveType(questionDef.question_type)) {
    return null
  }

  const correctOptionIds = questionDef.quiz_options.filter((o) => o.is_correct).map((o) => o.id)

  const studentAns = aq.student_answers
  let isCorrect = false

  if (Array.isArray(studentAns)) {
    // MCQ / Multi-select: arrays must match exactly (order-independent)
    isCorrect =
      studentAns.length === correctOptionIds.length &&
      correctOptionIds.every((id) => studentAns.includes(id))
  } else if (typeof studentAns === 'string' && correctOptionIds.length === 1) {
    isCorrect = studentAns === correctOptionIds[0]
  }

  const pointsEarned = isCorrect ? questionDef.points : 0

  return {
    attempt_id: aq.attempt_id,
    started_at: aq.started_at,
    question_id: aq.question_id,
    is_correct: isCorrect,
    points_earned: pointsEarned,
  }
}

// --------------------------------------------------------------------------
// Main Handler
// --------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  // Must use service_role to bypass RLS for background grading
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 2. Security: Ensure function is only invocable by Service Role or internal scheduler
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized: requires service role' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  let activeTicketId: string | undefined
  let activeRetryCount: number | undefined

  // 3. Circuit breaker: release stuck PROCESSING items (likely from previous function timeout)
  //    Items stuck in PROCESSING for > 2 minutes are reset to PENDING for re-queuing.
  try {
    await supabase
      .from('quiz_submission_queue')
      .update({
        status: 'PENDING',
        next_retry_at: new Date(Date.now() + 30_000).toISOString(),
      })
      .eq('status', 'PROCESSING')
      .lt('updated_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
  } catch {
    // Cleanup is best-effort — do not abort if column doesn't exist or query fails
  }

  // 4. Circuit breaker check: abort if too many recent failures (5+ in last 60s)
  const { count: recentFailures } = await supabase
    .from('quiz_submission_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'FAILED')
    .gte('submitted_at', new Date(Date.now() - 60_000).toISOString())

  if ((recentFailures ?? 0) >= 5) {
    return new Response(JSON.stringify({ error: 'Circuit breaker open — too many failures' }), {
      status: 503,
      headers: { 'Retry-After': '300', 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }

  try {
    // 5. Checkout a ticket from the queue (FOR UPDATE SKIP LOCKED via RPC)
    const { data: ticket, error: checkoutError } = await supabase.rpc(
      'v1_checkout_submission_queue'
    )

    if (checkoutError) throw checkoutError
    if (!ticket) {
      return jsonResponse({ message: 'No pending submissions' }, 200)
    }

    const { ticket_id, attempt_id, retry_count } = ticket as QueueTicket
    activeTicketId = ticket_id
    activeRetryCount = retry_count

    // 6. Fetch all attempt-question rows (explicit columns, no SELECT *)
    const { data: attemptQuestions, error: aqError } = await supabase
      .from('quiz_attempt_questions_v2')
      .select('attempt_id, started_at, question_id, student_answers, points_earned, is_correct')
      .eq('attempt_id', attempt_id)

    if (aqError) throw aqError

    const rows = (attemptQuestions ?? []) as AttemptQuestion[]
    const questionIds = rows.map((aq) => aq.question_id)

    let totalScore = 0
    const gradedQuestions: GradedQuestion[] = []
    let hasSubjectiveQuestion = false

    if (questionIds.length > 0) {
      // 7. Fetch question definitions — no question_bank join needed,
      //    question_type is a direct column on quiz_questions
      const { data: questionsData, error: qError } = await supabase
        .from('quiz_questions')
        .select(
          `
          id,
          points,
          question_type,
          quiz_options (
            id,
            is_correct
          )
        `
        )
        .in('id', questionIds)

      if (qError) throw qError

      const questionsMap = new Map<string, QuizQuestion>(
        (questionsData ?? []).map((q) => [q.id as string, q as QuizQuestion])
      )

      // 8. Grade each question
      for (const aq of rows) {
        const questionDef = questionsMap.get(aq.question_id)
        if (!questionDef) continue // Should not happen if manifest integrity holds

        if (isSubjectiveType(questionDef.question_type)) {
          // Track that at least one question needs manual grading
          hasSubjectiveQuestion = true
          // Do NOT push to gradedQuestions — leave existing row untouched
          continue
        }

        const result = gradeQuestion(aq, questionDef)
        if (result !== null) {
          totalScore += result.points_earned
          gradedQuestions.push(result)
        }
      }

      // 9. Bulk upsert graded objective questions (single round-trip, no N+1)
      if (gradedQuestions.length > 0) {
        const { error: upsertError } = await supabase
          .from('quiz_attempt_questions_v2')
          .upsert(gradedQuestions, { onConflict: 'attempt_id,question_id,started_at' })

        if (upsertError) throw upsertError
      }
    }

    // 10. Determine attempt status:
    //     - 'submitted'  → has ESSAY or SHORT_ANSWER (awaiting manual grading)
    //     - 'graded'     → all questions are objective and auto-graded
    const attemptStatus = hasSubjectiveQuestion ? 'submitted' : 'graded'

    // started_at is part of the composite PK on quiz_attempts_v2
    const attemptStartedAt = rows.length > 0 ? rows[0].started_at : null

    if (attemptStartedAt) {
      const { error: updateAttemptError } = await supabase
        .from('quiz_attempts_v2')
        .update({ score: totalScore, status: attemptStatus })
        .match({ id: attempt_id, started_at: attemptStartedAt })

      if (updateAttemptError) throw updateAttemptError
    } else {
      // Edge case: 0 questions answered
      const { error: updateAttemptError } = await supabase
        .from('quiz_attempts_v2')
        .update({ score: 0, status: attemptStatus })
        .eq('id', attempt_id)

      if (updateAttemptError) throw updateAttemptError
    }

    // 11. Mark Queue Ticket as COMPLETED
    const { error: queueError } = await supabase
      .from('quiz_submission_queue')
      .update({ status: 'COMPLETED' })
      .eq('id', ticket_id)

    if (queueError) throw queueError

    // 12. Phase 35C: Fire-and-forget LTI grade passback
    //     Only for fully auto-graded attempts (not 'submitted' which awaits manual grading).
    //     Fetch quiz metadata needed for passback (quiz_id + tenant_id)
    if (attemptStatus === 'graded') {
      try {
        const { data: attemptMeta } = await supabase
          .from('quiz_attempts_v2')
          .select('quiz_id, user_id, tenant_id')
          .eq('id', attempt_id)
          .limit(1)
          .maybeSingle()

        if (attemptMeta?.quiz_id && attemptMeta?.tenant_id && attemptMeta?.user_id) {
          const passbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/lti-grade-passback`
          const passbackServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

          // Determine max possible points from questions
          const maxPoints =
            rows.length > 0
              ? await supabase
                  .from('quiz_questions')
                  .select('points')
                  .in(
                    'id',
                    rows.map((r) => r.question_id)
                  )
                  .then(({ data }) => (data ?? []).reduce((sum, q) => sum + (q.points ?? 0), 0))
              : 100

          fetch(passbackUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${passbackServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tenant_id: attemptMeta.tenant_id,
              user_id: attemptMeta.user_id,
              resource_type: 'quiz',
              resource_id: attemptMeta.quiz_id,
              score: totalScore,
              max_score: maxPoints,
            }),
          }).catch(() => {}) // Fire and forget — passback failure must never fail grading
        }
      } catch {
        // Passback errors must never propagate — grading must always succeed
      }
    }

    return jsonResponse(
      { success: true, attempt_id, score: totalScore, status: attemptStatus },
      200
    )
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('GRADE_ATTEMPT_ERROR', {
      error: errMsg,
      ticket_id: activeTicketId,
      retry_count: activeRetryCount,
    })

    let newRetryCount = 0

    if (activeTicketId) {
      newRetryCount = (activeRetryCount ?? 0) + 1

      if (newRetryCount >= MAX_RETRIES) {
        // Terminal failure: move to dead letter queue
        await supabase.rpc('v1_mark_dead_letter', {
          p_ticket_id: activeTicketId,
          p_error_msg: errMsg,
        })
      } else {
        // Schedule retry with exponential backoff
        const backoffMs = BACKOFF_MS[activeRetryCount ?? 0] ?? BACKOFF_MS[0]
        await supabase.rpc('v1_schedule_retry_submission', {
          p_ticket_id: activeTicketId,
          p_retry_count: newRetryCount,
          p_error_msg: errMsg,
          p_backoff_ms: backoffMs,
        })
      }
    }

    return jsonResponse(
      { error: 'Internal Server Error', retry_scheduled: newRetryCount < MAX_RETRIES },
      500
    )
  }
})
