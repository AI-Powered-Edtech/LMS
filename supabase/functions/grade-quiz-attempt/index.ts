import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: grade-quiz-attempt (Phase 1)
// ==========================================================================
// Worker that processes pending quiz submissions.
// Checks out a ticket using FOR UPDATE SKIP LOCKED, grades the attempt locally,
// and updates the database via a transaction-like set of updates.

const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  // Must use service_role to bypass RLS for background grading
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 2. Security: Ensure function is not publicly invocable by enforcing Authorization matches Service Role or Webhook Secret
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

  try {
    // 1. Checkout a ticket from the queue
    const { data: ticket, error: checkoutError } = await supabase.rpc(
      'v1_checkout_submission_queue'
    )

    if (checkoutError) throw checkoutError
    if (!ticket) {
      return new Response(JSON.stringify({ message: 'No pending submissions' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
      })
    }

    const { ticket_id, attempt_id, tenant_id } = ticket
    activeTicketId = ticket_id

    // 2. Fetch the attempt answers
    const { data: attemptQuestions, error: aqError } = await supabase
      .from('quiz_attempt_questions_v2')
      .select('*')
      .eq('attempt_id', attempt_id)

    if (aqError) throw aqError

    // 3. Fetch the correct answers from the question bank via quiz_questions
    // We only need the valid options (is_correct = true) to grade against.
    const questionIds = attemptQuestions?.map((aq: any) => aq.question_id) || []

    let totalScore = 0
    let gradedQuestions: any[] = []

    if (questionIds.length > 0) {
      const { data: questionsData, error: qError } = await supabase
        .from('quiz_questions')
        .select(
          `
                    id,
                    points,
                    question_bank!inner (
                        question_type,
                        question_options (
                            id,
                            is_correct
                        )
                    )
                `
        )
        .in('id', questionIds)

      if (qError) throw qError

      // 4. Perform Grading
      const questionsMap = new Map(questionsData?.map((q: any) => [q.id, q]))

      for (const aq of attemptQuestions || []) {
        const questionDef = questionsMap.get(aq.question_id)
        if (!questionDef) continue // Should not happen if manifest integrity holds

        const bankRec = Array.isArray(questionDef.question_bank)
          ? questionDef.question_bank[0]
          : questionDef.question_bank
        const options = bankRec?.question_options || []
        const correctOptionIds = options.filter((o: any) => o.is_correct).map((o: any) => o.id)

        // student_answers is expected to be an array of selected option UUIDs
        // or a single string for short answer (Phase 1 focus on MCQ/Multi-Select)
        let isCorrect = false
        const studentAns = aq.student_answers

        if (Array.isArray(studentAns)) {
          // Check if arrays match exactly (regardless of order)
          if (
            studentAns.length === correctOptionIds.length &&
            correctOptionIds.every((id: any) => studentAns.includes(id))
          ) {
            isCorrect = true
          }
        } else if (typeof studentAns === 'string' && correctOptionIds.length === 1) {
          if (studentAns === correctOptionIds[0]) {
            isCorrect = true
          }
        }

        const pointsEarned = isCorrect ? questionDef.points : 0
        totalScore += pointsEarned

        gradedQuestions.push({
          attempt_id: aq.attempt_id,
          started_at: aq.started_at,
          question_id: aq.question_id,
          is_correct: isCorrect,
          points_earned: pointsEarned,
        })
      }

      // 5. Update graded questions individually
      // In a production system with enormous concurrency, you might bulk-upsert via RPC
      for (const gq of gradedQuestions) {
        await supabase
          .from('quiz_attempt_questions_v2')
          .update({ is_correct: gq.is_correct, points_earned: gq.points_earned })
          .match({
            attempt_id: gq.attempt_id,
            question_id: gq.question_id,
            started_at: gq.started_at,
          })
      }
    }

    // 6. Update Attempt status and score
    // started_at is part of PK for v2
    const attemptStartedAt =
      attemptQuestions && attemptQuestions.length > 0 ? attemptQuestions[0].started_at : null

    if (attemptStartedAt) {
      await supabase
        .from('quiz_attempts_v2')
        .update({ score: totalScore, status: 'GRADED' })
        .match({ id: attempt_id, started_at: attemptStartedAt })
    } else {
      // Handle edge case of 0 questions answered
      await supabase
        .from('quiz_attempts_v2')
        .update({ score: 0, status: 'GRADED' })
        .eq('id', attempt_id)
    }

    // 7. Mark Queue Ticket Completed
    await supabase.from('quiz_submission_queue').update({ status: 'COMPLETED' }).eq('id', ticket_id)

    return new Response(JSON.stringify({ success: true, attempt_id, score: totalScore }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  } catch (err: any) {
    console.error('GRADE_ATTEMPT_ERROR', err)
    // Mark the ticket as FAILED to avoid stuck queue
    if (activeTicketId) {
      await supabase
        .from('quiz_submission_queue')
        .update({ status: 'FAILED' })
        .eq('id', activeTicketId)
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    })
  }
})
