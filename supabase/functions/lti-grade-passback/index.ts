import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: lti-grade-passback
// Phase 35C — LTI 1.3 Assignment and Grade Services (AGS) grade passback
//
// Receives a graded quiz/assignment result and forwards it to the external
// LTI platform's AGS lineitem endpoint. Called fire-and-forget from
// grade-quiz-attempt — failures here never block student results.
//
// Auth: Accepts either service role key (internal calls) or user JWT.
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status)
}

// --------------------------------------------------------------------------
// Main Handler
// --------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Metode tidak valid', 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Accept both service-role key (internal) and user JWT (frontend)
    const authHeader = req.headers.get('Authorization') ?? ''
    const isServiceRole = authHeader === `Bearer ${serviceKey}`

    // For user JWT calls, validate auth
    if (!isServiceRole) {
      const userToken = authHeader.replace('Bearer ', '')
      if (!userToken) {
        return errorResponse('Tidak terautentikasi', 401)
      }
    }

    // Use service client for all DB operations (bypasses RLS for audit log writes)
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse('Body tidak valid: harus JSON', 400)
    }

    const { tenant_id, user_id, resource_type, resource_id, score, max_score } = body as {
      tenant_id?: string
      user_id?: string
      resource_type?: string
      resource_id?: string
      score?: number
      max_score?: number
    }

    // Validate required fields
    if (!tenant_id || !user_id || !resource_type || !resource_id) {
      return errorResponse(
        'Field wajib tidak lengkap: tenant_id, user_id, resource_type, resource_id',
        400
      )
    }

    if (resource_type !== 'quiz' && resource_type !== 'assignment') {
      return errorResponse("resource_type harus 'quiz' atau 'assignment'", 400)
    }

    const scoreNum = typeof score === 'number' ? score : 0
    const maxScoreNum = typeof max_score === 'number' ? max_score : 100

    // Find active LTI platform with AGS configured for this tenant
    const { data: platform, error: platformError } = await serviceClient
      .from('lti_platform_registrations')
      .select('id, client_id, platform_name, ags_lineitem_url, ags_scope, tenant_id')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .not('ags_lineitem_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (platformError) {
      console.error('LTI_PASSBACK_PLATFORM_QUERY_ERROR', {
        error: platformError.message,
        tenant_id,
      })
    }

    // No platform or AGS not configured — log and return gracefully
    if (!platform || !platform.ags_lineitem_url) {
      await serviceClient.from('lti_grade_passback_log').insert({
        user_id,
        resource_type,
        resource_id,
        score_sent: scoreNum,
        max_score: maxScoreNum,
        status: 'failed',
        error_message: 'Tidak ada platform LTI aktif yang dikonfigurasi dengan AGS',
        tenant_id,
      })

      return jsonResponse({ success: false, reason: 'no_platform' })
    }

    // Build AGS score payload per IMS Global LTI 1.3 spec
    const lineitemScoreUrl = `${platform.ags_lineitem_url}/scores`
    const scorePayload = {
      userId: user_id,
      scoreGiven: scoreNum,
      scoreMaximum: maxScoreNum,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      timestamp: new Date().toISOString(),
    }

    // NOTE: In production, generate a proper LTI 1.3 signed JWT for the
    // Authorization header using the platform's client credentials.
    // For this implementation, we use a placeholder that can be replaced
    // with a proper OAuth 2.0 client_credentials flow.
    let passbackStatus: 'success' | 'failed' = 'success'
    let errorMsg: string | null = null

    try {
      const response = await fetch(lineitemScoreUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.ims.lis.v1.score+json',
          // TODO Phase 35D: replace with proper LTI 1.3 signed JWT
          Authorization: `Bearer placeholder_lti_jwt_${platform.client_id}`,
        },
        body: JSON.stringify(scorePayload),
        // 10 second timeout to avoid blocking queue processor
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        const responseText = await response.text().catch(() => '')
        passbackStatus = 'failed'
        errorMsg = `HTTP ${response.status}: ${responseText.slice(0, 500)}`
      }
    } catch (fetchErr) {
      passbackStatus = 'failed'
      errorMsg = fetchErr instanceof Error ? fetchErr.message : 'Network error'
    }

    // Audit log — always write regardless of success/failure
    const { error: logError } = await serviceClient.from('lti_grade_passback_log').insert({
      platform_id: platform.id,
      user_id,
      resource_type,
      resource_id,
      score_sent: scoreNum,
      max_score: maxScoreNum,
      status: passbackStatus,
      error_message: errorMsg,
      tenant_id,
    })

    if (logError) {
      console.error('LTI_PASSBACK_LOG_ERROR', { error: logError.message })
    }

    console.log(
      JSON.stringify({
        component: 'lti-grade-passback',
        status: passbackStatus,
        tenant_id,
        resource_type,
        resource_id,
        score: scoreNum,
        max_score: maxScoreNum,
      })
    )

    return jsonResponse({ success: passbackStatus === 'success', error: errorMsg })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('LTI_PASSBACK_UNHANDLED_ERROR', { error: message })
    return errorResponse(`Kesalahan server: ${message}`, 500)
  }
})
