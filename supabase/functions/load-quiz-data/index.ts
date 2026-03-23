import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: load-quiz-data (Phase 1)
// ==========================================================================
// Prepares and serves quiz data strictly stripping out 'is_correct' answers.
// Caching can be applied at the edge (e.g. via Redis/fly.io) in the future.

const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

function jsonResponse(data: any, status = 200) {
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

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return errorResponse('TENANT_MISSING', 403)
    }

    // 3. Parse Request Payload
    const body = await req.json()
    const { quiz_id, version_ids } = body

    if (!quiz_id || !version_ids || !Array.isArray(version_ids)) {
      return errorResponse('INVALID_PAYLOAD', 400)
    }

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
    const formattedQuestions =
      questionsData?.map((q) => {
        const bankRec = Array.isArray(q.question_bank) ? q.question_bank[0] : q.question_bank
        return {
          version_id: q.id, // Phase 1 uses quiz_questions.id as version_id
          question_type: bankRec?.question_type,
          content: {
            text: bankRec?.question_text,
          },
          points_max: q.points,
          options:
            bankRec?.question_options?.sort((a: any, b: any) => a.order_index - b.order_index) ||
            [],
        }
      }) || []

    // 6. Return standard response
    return jsonResponse({
      questions: formattedQuestions,
    })
  } catch (err: any) {
    console.error('LOAD_QUIZ_DATA_ERROR', err)
    if (err.message === 'AUTH_MISSING') return errorResponse('Unauthorized', 401)
    return errorResponse('Internal Server Error', 500)
  }
})
