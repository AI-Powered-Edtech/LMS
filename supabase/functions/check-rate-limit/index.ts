/**
 * Edge Function: check-rate-limit
 *
 * Server-side rate limiting for critical endpoints (login, password-reset).
 * Client calls this BEFORE submitting credentials.
 *
 * Request:
 *   POST /functions/v1/check-rate-limit
 *   { action: 'login', key: 'email@example.com', maxAttempts: 5, windowMs: 60000 }
 *
 * Response:
 *   200 { allowed: true, remaining: 4 }
 *   429 { allowed: false, retryAfterMs: 45000, error: 'RATE_LIMITED' }
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

  try {
    const { action, key, maxAttempts = 5, windowMs = 60_000 } = await req.json()

    if (!action || !key) {
      return json({ error: 'MISSING_PARAMS' }, 400)
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const rateLimitKey = `${action}:${key}`
    const now = new Date()
    const windowStart = new Date(now.getTime() - windowMs)

    // Get or create rate limit entry
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('id, attempts, window_start')
      .eq('key', rateLimitKey)
      .eq('action', action)
      .maybeSingle()

    if (!existing) {
      // First attempt — create entry
      await supabase.from('rate_limits').insert({
        key: rateLimitKey,
        action,
        attempts: 1,
        window_start: now.toISOString(),
      })
      return json({ allowed: true, remaining: maxAttempts - 1 })
    }

    const entryWindowStart = new Date(existing.window_start)
    const isExpired = entryWindowStart < windowStart

    if (isExpired) {
      // Window expired — reset counter
      await supabase
        .from('rate_limits')
        .update({ attempts: 1, window_start: now.toISOString() })
        .eq('id', existing.id)
      return json({ allowed: true, remaining: maxAttempts - 1 })
    }

    if (existing.attempts >= maxAttempts) {
      // Rate limited
      const retryAfterMs = windowMs - (now.getTime() - entryWindowStart.getTime())
      return json({ allowed: false, retryAfterMs, error: 'RATE_LIMITED' }, 429)
    }

    // Increment counter
    await supabase
      .from('rate_limits')
      .update({ attempts: existing.attempts + 1 })
      .eq('id', existing.id)

    return json({ allowed: true, remaining: maxAttempts - existing.attempts - 1 })
  } catch (err) {
    console.error('[check-rate-limit] Error:', err)
    // Fail open — allow request if rate limit service is down
    return json({ allowed: true, remaining: -1, error: 'SERVICE_ERROR' })
  }
})
