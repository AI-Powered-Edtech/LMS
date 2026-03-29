import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: progress-events
//
// Endpoint: POST /functions/v1/progress-events
//
// Tasks:
//   1. Validate payload size (max 100KB) and event count (max 100)
//   2. Validate each event against schema v1 (including event_id)
//   3. Check queue backpressure (reject if queue > 50k)
//   4. Publish valid events to pgmq queue "progress_events"
//   5. Fire-and-forget trigger to process-progress-events
//   6. Log observability metrics
// ==========================================================================

// [IN-M1] Allow env-var overrides so limits are tuneable per environment
// without redeploying. Falls back to sensible defaults.
const MAX_EVENTS_PER_REQUEST = Number(Deno.env.get('PROGRESS_MAX_EVENTS_PER_REQUEST')) || 100
const MAX_PAYLOAD_BYTES = Number(Deno.env.get('PROGRESS_MAX_PAYLOAD_BYTES')) || 100 * 1024 // 100KB
const QUEUE_BACKPRESSURE_LIMIT = Number(Deno.env.get('PROGRESS_QUEUE_BACKPRESSURE_LIMIT')) || 50_000

const REQUIRED_FIELDS = [
  'event_id',
  'event_version',
  'tenant_id',
  'user_id',
  'lesson_id',
  'event_type',
  'timestamp',
] as const

const VALID_EVENT_TYPES = new Set([
  'video_started',
  'video_progress',
  'video_paused',
  'video_seek',
  'video_ended',
  'lesson_started',
  'lesson_completed',
  'lesson_abandoned',
  'quiz_started',
  'quiz_submitted',
])

// UUID v4 format validation (IN-H1)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_STRING_FIELD_LENGTH = 255

interface TelemetryEvent {
  event_id: string
  event_version: number
  tenant_id: string
  user_id: string
  course_id?: string
  lesson_id: string
  event_type: string
  position?: number // video position in seconds
  timestamp: number // unix ms
  session_id?: string
  device_type?: string
}

function validateEvent(event: unknown): { valid: boolean; error?: string } {
  if (typeof event !== 'object' || event === null) {
    return { valid: false, error: 'Event must be an object' }
  }

  const e = event as Record<string, unknown>

  for (const field of REQUIRED_FIELDS) {
    if (e[field] === undefined || e[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` }
    }
  }

  if (e.event_version !== 1) {
    return { valid: false, error: `Unsupported event_version: ${e.event_version}` }
  }

  if (!VALID_EVENT_TYPES.has(e.event_type as string)) {
    return { valid: false, error: `Unknown event_type: ${e.event_type}` }
  }

  if (typeof e.timestamp !== 'number') {
    return { valid: false, error: 'timestamp must be a number (unix ms)' }
  }

  // Validate UUID format for all ID fields (IN-H1)
  for (const idField of ['event_id', 'tenant_id', 'user_id', 'lesson_id']) {
    if (typeof e[idField] !== 'string' || !UUID_RE.test(e[idField] as string)) {
      return { valid: false, error: `${idField} must be a valid UUID` }
    }
  }

  // Validate optional string fields length (SC-H1)
  for (const optField of ['session_id', 'device_type', 'course_id']) {
    if (e[optField] !== undefined && (typeof e[optField] !== 'string' || (e[optField] as string).length > MAX_STRING_FIELD_LENGTH)) {
      return { valid: false, error: `${optField} must be a string <= ${MAX_STRING_FIELD_LENGTH} chars` }
    }
  }

  // Validate position is a non-negative number if provided
  if (e.position !== undefined && (typeof e.position !== 'number' || e.position < 0)) {
    return { valid: false, error: 'position must be a non-negative number' }
  }

  return { valid: true }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const startTime = Date.now()

  // --- JWT Authentication ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Verify JWT using anon client to extract authenticated user
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const authenticatedUserId = user.id

  // Service role client for queue operations
  const supabase = createClient(supabaseUrl, supabaseKey)

  let rawBody: string
  let events: unknown[]
  try {
    rawBody = await req.text()

    // Double-check actual payload size
    if (new TextEncoder().encode(rawBody).length > MAX_PAYLOAD_BYTES) {
      return new Response(
        JSON.stringify({ error: `Payload too large. Max ${MAX_PAYLOAD_BYTES} bytes.` }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = JSON.parse(rawBody)
    if (!Array.isArray(body)) {
      return new Response(JSON.stringify({ error: 'Request body must be an array of events' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    events = body
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Event count limit ---
  if (events.length > MAX_EVENTS_PER_REQUEST) {
    return new Response(
      JSON.stringify({ error: `Too many events. Max ${MAX_EVENTS_PER_REQUEST} per request.` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (events.length === 0) {
    return new Response(JSON.stringify({ received: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Queue backpressure check ---
  try {
    const { data: metrics, error: metricsError } = await supabase.rpc('pgmq_metrics', {
      queue_name: 'progress_events',
    })

    if (!metricsError && metrics) {
      const queueLength = Array.isArray(metrics)
        ? (metrics[0]?.queue_length ?? 0)
        : (metrics.queue_length ?? 0)

      if (queueLength > QUEUE_BACKPRESSURE_LIMIT) {
        console.warn(
          JSON.stringify({
            component: 'progress-events',
            warning: 'backpressure_triggered',
            queue_length: queueLength,
            limit: QUEUE_BACKPRESSURE_LIMIT,
          })
        )
        return new Response(JSON.stringify({ error: 'Server busy. Please retry later.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '10' },
        })
      }
    }
  } catch (e) {
    // If metrics check fails, continue processing (fail-open for availability)
    console.warn('[progress-events] Could not check queue metrics:', e)
  }

  // --- Validate events ---
  const validEvents: TelemetryEvent[] = []
  const errors: { index: number; error: string }[] = []

  for (let i = 0; i < events.length; i++) {
    const result = validateEvent(events[i])
    if (!result.valid) {
      errors.push({ index: i, error: result.error! })
      continue
    }
    // Enforce that user_id in event matches the authenticated user
    const evt = events[i] as TelemetryEvent
    if (evt.user_id !== authenticatedUserId) {
      errors.push({ index: i, error: 'user_id does not match authenticated user' })
      continue
    }
    validEvents.push(evt)
  }

  // --- Enqueue valid events into pgmq ---
  let tenantId = ''
  if (validEvents.length > 0) {
    tenantId = validEvents[0].tenant_id

    const { error: queueError } = await supabase.rpc('pgmq_send_batch', {
      queue_name: 'progress_events',
      messages: validEvents,
    })

    if (queueError) {
      console.error('[progress-events] Failed to enqueue:', queueError)
      return new Response(JSON.stringify({ error: 'Failed to enqueue events' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // --- Trigger queue processing with error tracking (IN-1 fix) ---
  // Previously fire-and-forget with silent failures. Now tracks trigger status
  // and logs structured errors for observability/alerting.
  let processorTriggered = false
  try {
    const processUrl = `${supabaseUrl}/functions/v1/process-progress-events`
    const triggerResponse = await Promise.race([
      fetch(processUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      // 2-second timeout — don't block ingestion response for too long
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Processor trigger timeout (2s)')), 2000)
      ),
    ]).catch((err) => {
      console.error(
        JSON.stringify({
          component: 'progress-events',
          severity: 'error',
          error: 'processor_trigger_failed',
          message: err instanceof Error ? err.message : String(err),
          tenant_id: tenantId,
          events_enqueued: validEvents.length,
        })
      )
      return null
    })

    processorTriggered = triggerResponse !== null && (triggerResponse as Response).ok !== false
  } catch (e) {
    console.error(
      JSON.stringify({
        component: 'progress-events',
        severity: 'error',
        error: 'processor_trigger_exception',
        message: e instanceof Error ? e.message : String(e),
        tenant_id: tenantId,
      })
    )
    // NOTE: Consider adding a pg_cron fallback to drain orphaned queue messages
    // if processor triggers fail repeatedly.
  }

  const queueLatencyMs = Date.now() - startTime

  // --- Observability logging ---
  console.log(
    JSON.stringify({
      component: 'progress-events',
      tenant_id: tenantId,
      events_received: events.length,
      events_enqueued: validEvents.length,
      events_skipped: errors.length,
      processor_triggered: processorTriggered,
      queue_latency_ms: queueLatencyMs,
    })
  )

  return new Response(
    JSON.stringify({
      received: events.length,
      enqueued: validEvents.length,
      skipped: errors.length,
      processor_triggered: processorTriggered,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
