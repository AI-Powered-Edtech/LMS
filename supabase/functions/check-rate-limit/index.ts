/**
 * Edge Function: check-rate-limit
 *
 * Server-side rate limiting for critical endpoints (login, password-reset).
 * Client calls this BEFORE submitting credentials.
 *
 * Atomicity guarantee: all counter logic runs inside the PL/pgSQL function
 * `check_and_increment_rate_limit_v2`, which uses SELECT FOR UPDATE to prevent
 * TOCTOU race conditions. Concurrent requests for the same (action, key) are
 * serialised at the database row level.
 *
 * Fail-closed behaviour: if the Supabase service is unavailable or the RPC
 * call fails for any reason, this function returns HTTP 503 with
 * `{ allowed: false }`. Rate limiting is NEVER bypassed on error.
 *
 * Request:
 *   POST /functions/v1/check-rate-limit
 *   { action: 'login', key: 'email@example.com', maxAttempts?: 5, windowMs?: 60000 }
 *
 * Response (success — under limit):
 *   200 { allowed: true, remaining: 4 }
 *
 * Response (success — at limit):
 *   200 { allowed: true, remaining: 0 }
 *
 * Response (rate limited):
 *   429 { allowed: false, retryAfterMs: 45000, error: 'RATE_LIMITED' }
 *
 * Response (service unavailable):
 *   503 { allowed: false, error: 'SECURITY_SERVICE_UNAVAILABLE', retryAfterMs: 5000 }
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() })
  }

  let action: string | undefined
  let key: string | undefined
  let maxAttempts: number
  let windowMs: number

  try {
    const body = await req.json()
    action = body.action
    key = body.key
    maxAttempts = typeof body.maxAttempts === 'number' ? body.maxAttempts : 5
    windowMs = typeof body.windowMs === 'number' ? body.windowMs : 60_000
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }

  if (!action || !key) {
    return json({ error: 'MISSING_PARAMS' }, 400)
  }

  // Use service role to call the atomic rate-limit RPC (bypasses RLS by design)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const rateLimitKey = `${action}:${key}`

  let rpcData: { allowed: boolean; remaining: number; retry_after_ms: number } | null = null
  let rpcError: unknown = null

  try {
    const { data, error } = await supabase.rpc('check_and_increment_rate_limit_v2', {
      p_key: rateLimitKey,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_ms: windowMs,
    })

    rpcData = data as typeof rpcData
    rpcError = error
  } catch (networkErr) {
    // Network-level failure — fail-closed
    console.error('[check-rate-limit] Network error calling RPC:', networkErr)
    return json({ allowed: false, error: 'SECURITY_SERVICE_UNAVAILABLE', retryAfterMs: 5000 }, 503)
  }

  if (rpcError || rpcData === null) {
    // RPC returned a PostgREST/database error — fail-closed
    console.error('[check-rate-limit] RPC error:', rpcError)
    return json({ allowed: false, error: 'SECURITY_SERVICE_UNAVAILABLE', retryAfterMs: 5000 }, 503)
  }

  if (!rpcData.allowed) {
    return json(
      {
        allowed: false,
        retryAfterMs: rpcData.retry_after_ms ?? windowMs,
        error: 'RATE_LIMITED',
      },
      429
    )
  }

  return json({ allowed: true, remaining: rpcData.remaining })
})
