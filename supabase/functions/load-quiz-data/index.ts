import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: load-quiz-data
// ==========================================================================
// Prepares and serves quiz data strictly stripping out 'is_correct' answers.
//
// Phase 33A addendum: supports server-side pool mode.
// When a quiz has quiz_pool_config rows, questions are drawn from question
// banks using get_pool_questions_for_attempt() with the attempt_seed so
// each student gets a deterministic but unique question set.

const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
  })
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
  })
}

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
  }

  try {
    // 2. Authentication & Tenant Verification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('AUTH_MISSING')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // Use anon key for user context, ensuring RLS blocks cross-tenant reads
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return errorResponse('AUTH_INVALID', 401)
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined
    if (!tenantId) {
      return errorResponse('TENANT_MISSING', 403)
    }

    // 3. Parse Request Payload
    const body = await req.json()
    const { quiz_id, version_ids, attempt_seed } = body

    if (!quiz_id || !version_ids || !Array.isArray(version_ids)) {
      return errorResponse('INVALID_PAYLOAD', 400)
    }

    // ── Phase 33A: Check if pool mode is active for this quiz ────────────────
    // Pool mode is active when quiz_pool_config rows exist for this quiz.
    // We do a lightweight count check before deciding which fetch path to use.
    const { count: poolConfigCount, error: poolCountError } = await supabase
      .from('quiz_pool_config')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quiz_id)
      .eq('tenant_id', tenantId)

    if (poolCountError) {
      console.error('POOL_COUNT_ERROR', poolCountError)
      return errorResponse('DATABASE_ERROR', 500)
    }

    const isPoolMode = (poolConfigCount ?? 0) > 0

    // ── Path A: Pool mode — draw questions via server-side RPC ──────────────
    if (isPoolMode && attempt_seed) {
      const { data: poolData, error: poolError } = await supabase.rpc(
        'get_pool_questions_for_attempt',
        {
          p_quiz_id: quiz_id,
          p_seed: attempt_seed,
          p_tenant_id: tenantId,
        }
      )

      if (poolError) {
        console.error('POOL_RPC_ERROR', poolError)
        return errorResponse('POOL_DRAW_FAILED', 500)
      }

      // Transform pool RPC result into the standard API contract.
      // explanation is intentionally omitted (revealed only after submission).
      // options come back as jsonb from the RPC already without is_correct.
      const formattedPoolQuestions = (poolData ?? []).map(
        (q: {
          id: string
          text: string
          question_type: string
          points: number
          order: number
          options: Array<{ id: string; option_text: string; order_index: number }>
        }) => ({
          version_id: q.id,
          question_type: q.question_type,
          content: { text: q.text },
          points_max: q.points,
          options: (q.options ?? []).sort(
            (a: { order_index: number }, b: { order_index: number }) =>
              a.order_index - b.order_index
          ),
          pool_mode: true,
        })
      )

      return jsonResponse({
        questions: formattedPoolQuestions,
        pool_mode: true,
      })
    }

    // ── Path B: Fixed quiz_questions (original behaviour) ────────────────────
    // 4. Fetch the Data
    // We explicitly omit 'is_correct' or 'explanation' to guarantee they never leak to the client
    const { data: questionsData, error: dbError } = await supabase
      .from('quiz_questions')
      .select(
        `
                id,
                points,
                "order",
                question_bank!inner (
                    id,
                    question_type,
                    question_text,
                    question_options (
                        id,
                        option_text,
                        order_index
                    )
                )
            `
      )
      .eq('tenant_id', tenantId)
      .eq('question_bank.tenant_id', tenantId)
      .eq('quiz_id', quiz_id)
      .in('id', version_ids)
      .order('order', { ascending: true })

    if (dbError) {
      console.error('DB_FETCH_ERROR', dbError)
      return errorResponse('DATABASE_ERROR', 500)
    }

    // 5. Transform to API Contract format
    const formattedQuestions = (questionsData ?? []).map(
      (q: {
        id: string
        points: number
        order: number
        question_bank:
          | {
              id: string
              question_type: string
              question_text: string
              question_options: Array<{ id: string; option_text: string; order_index: number }>
            }
          | Array<{
              id: string
              question_type: string
              question_text: string
              question_options: Array<{ id: string; option_text: string; order_index: number }>
            }>
      }) => {
        const bankRec = Array.isArray(q.question_bank) ? q.question_bank[0] : q.question_bank
        return {
          version_id: q.id, // Phase 1 uses quiz_questions.id as version_id
          question_type: bankRec?.question_type,
          content: { text: bankRec?.question_text },
          points_max: q.points,
          options: (bankRec?.question_options ?? []).sort(
            (a: { order_index: number }, b: { order_index: number }) =>
              a.order_index - b.order_index
          ),
          pool_mode: false,
        }
      }
    )

    // 6. Return standard response
    return jsonResponse({
      questions: formattedQuestions,
      pool_mode: false,
    })
  } catch (err: unknown) {
    console.error('LOAD_QUIZ_DATA_ERROR', err)
    const message = err instanceof Error ? err.message : 'Unknown'
    if (message === 'AUTH_MISSING') return errorResponse('Unauthorized', 401)
    return errorResponse('Internal Server Error', 500)
  }
})
