import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js'

// ==========================================================================
// Edge Function: process-progress-events
//
// Reads from pgmq queue, aggregates by (user_id, lesson_id),
// upserts to lesson_progress, and deletes processed messages.
//
// Stability features:
//   - Advisory lock prevents queue stampede (only 1 processor at a time)
//   - Time-capped processing (max 3 seconds) prevents cold start burst
//   - Observability: queue_depth + oldest_event_age
// ==========================================================================

// Lock key derived from queue name — avoids hardcoded magic numbers
// hashtext('progress_events') is computed at runtime via SQL
const MAX_PROCESSING_MS = 3_000
const BATCH_SIZE_NORMAL = 100
const BATCH_SIZE_CATCHUP = 500
const CATCHUP_THRESHOLD = 10_000

const databaseUrl = Deno.env.get('SUPABASE_DB_URL') || ''

const sql = postgres(databaseUrl, {
  max: 3, // Keep pool small for serverless
  idle_timeout: 10,
  connect_timeout: 10,
})

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // --- Security: Require Authentication ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (token !== anonKey && token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const startTime = Date.now()
  let totalProcessed = 0
  let totalAggregationMs = 0
  let totalDbWriteMs = 0
  let iterations = 0
  let totalPoisonMessages = 0

  try {
    if (!databaseUrl) {
      throw new Error('Missing SUPABASE_DB_URL environment variable.')
    }

    // ─── 1. Acquire advisory lock (prevents queue stampede) ───
    const [lockResult] =
      await sql`SELECT pg_try_advisory_lock(hashtext('progress_events')) AS locked`

    if (!lockResult.locked) {
      return new Response(
        JSON.stringify({
          message: 'Processor already running',
          skipped: true,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    try {
      // ─── 2. Queue observability metrics ───
      let queueDepth = 0
      let oldestEventAge: string | null = null

      try {
        const [metrics] = await sql`
          SELECT 
            count(*)::int AS queue_depth,
            (now() - min(enqueued_at))::text AS oldest_event_age
          FROM pgmq.q_progress_events
        `
        queueDepth = metrics.queue_depth ?? 0
        oldestEventAge = metrics.oldest_event_age
      } catch {
        // Table may not exist yet if queue is empty — safe to ignore
      }

      // ─── 3. Adaptive batch size ───
      // Larger batches when queue is deep (catch-up mode after traffic spikes)
      const batchSize = queueDepth > CATCHUP_THRESHOLD ? BATCH_SIZE_CATCHUP : BATCH_SIZE_NORMAL

      // ─── 4. Time-capped processing loop ───
      while (Date.now() - startTime < MAX_PROCESSING_MS) {
        // Read a batch from the queue
        const messages = await sql`SELECT * FROM pgmq.read('progress_events', 30, ${batchSize})`

        if (messages.length === 0) break // Queue drained

        iterations++

        // ─── 4. Aggregate by (user_id, lesson_id) ───
        const aggStart = Date.now()
        const aggregated = new Map<string, any>()
        const msgIds: number[] = []

        // Poison message resilience (IN-H3) — skip malformed events instead of crashing
        for (const row of messages) {
          msgIds.push(row.msg_id)
          try {
            const event = row.message
            if (!event?.user_id || !event?.lesson_id || !event?.tenant_id) {
              totalPoisonMessages++
              continue
            }
            const key = `${event.user_id}_${event.lesson_id}`
            const existing = aggregated.get(key)

            if (!existing) {
              aggregated.set(key, {
                ...event,
                position: event.position ?? 0,
                is_completed: event.event_type === 'lesson_completed',
              })
            } else {
              if ((event.position ?? 0) > existing.position) {
                existing.position = event.position
              }
              if (event.event_type === 'lesson_completed') {
                existing.is_completed = true
              }
            }
          } catch {
            totalPoisonMessages++
          }
        }

        totalAggregationMs += Date.now() - aggStart
        totalProcessed += msgIds.length

        // ─── 5. Upsert + delete in transaction ───
        const writeStart = Date.now()

        await sql.begin(async (tx) => {
          // Batch upsert — single query instead of N individual inserts (PF-H3)
          const rows = [...aggregated.values()].map((e) => ({
            tenant_id: e.tenant_id,
            user_id: e.user_id,
            lesson_id: e.lesson_id,
            position: e.position,
            is_completed: e.is_completed,
          }))

          if (rows.length > 0) {
            await tx`
              INSERT INTO lesson_progress (
                tenant_id, user_id, lesson_id,
                last_position_seconds, progress_percent,
                is_completed, updated_at
              )
              SELECT
                (r->>'tenant_id')::uuid,
                (r->>'user_id')::uuid,
                (r->>'lesson_id')::uuid,
                COALESCE((r->>'position')::int, 0),
                0,
                COALESCE((r->>'is_completed')::bool, false),
                NOW()
              FROM jsonb_array_elements(${JSON.stringify(rows)}::jsonb) AS r
              ON CONFLICT (user_id, lesson_id)
              DO UPDATE SET
                last_position_seconds = GREATEST(lesson_progress.last_position_seconds, EXCLUDED.last_position_seconds),
                progress_percent = GREATEST(lesson_progress.progress_percent, EXCLUDED.progress_percent),
                is_completed = (lesson_progress.is_completed OR EXCLUDED.is_completed),
                updated_at = NOW()
            `
          }

          await tx`SELECT pgmq.delete('progress_events', ${msgIds}::bigint[])`
        })

        totalDbWriteMs += Date.now() - writeStart
      }

      // ─── 6. Observability logging ───
      console.log(
        JSON.stringify({
          component: 'process-progress-events',
          events_processed: totalProcessed,
          poison_messages: totalPoisonMessages,
          iterations,
          aggregation_time_ms: totalAggregationMs,
          db_write_latency_ms: totalDbWriteMs,
          total_duration_ms: Date.now() - startTime,
          queue_depth: queueDepth,
          oldest_event_age: oldestEventAge,
        })
      )
    } finally {
      // ─── Always release the advisory lock ───
      await sql`SELECT pg_advisory_unlock(hashtext('progress_events'))`
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        iterations,
        duration_ms: Date.now() - startTime,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    // Attempt to release lock on error too
    try {
      await sql`SELECT pg_advisory_unlock(hashtext('progress_events'))`
    } catch {
      /* noop */
    }

    console.error('[process-progress-events] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
