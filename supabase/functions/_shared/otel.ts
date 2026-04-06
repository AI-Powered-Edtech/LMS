// ==========================================================================
// OpenTelemetry Instrumentation — Shared Module for Edge Functions
// Sprint B: Developer Experience & Observability
//
// Lightweight OTel wrapper for Supabase Edge Functions.
// Uses OTLP/HTTP exporter (compatible with Grafana Cloud, Honeycomb, etc.)
//
// Usage in Edge Functions:
//   import { withTracing, createSpan } from '../_shared/otel.ts'
//   Deno.serve(withTracing('ai-grade-essay', handler))
// ==========================================================================

const OTEL_ENDPOINT = Deno.env.get('OTEL_EXPORTER_OTLP_ENDPOINT') || ''
const OTEL_HEADERS = Deno.env.get('OTEL_EXPORTER_OTLP_HEADERS') || ''
const SERVICE_NAME = 'edusync-edge-functions'
const SERVICE_VERSION = Deno.env.get('SERVICE_VERSION') || 'v0.3'

// ── Types ─────────────────────────────────────────────────────────────────

interface SpanEvent {
  name: string
  timestamp: number
  attributes?: Record<string, string | number | boolean>
}

interface Span {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: number // 1=SERVER, 2=CLIENT, 3=PRODUCER, 4=CONSUMER
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }>
  events: SpanEvent[]
  status: { code: number; message?: string } // 0=UNSET, 1=OK, 2=ERROR
}

interface SpanContext {
  traceId: string
  spanId: string
  startTime: number
  events: SpanEvent[]
  attributes: Record<string, string | number | boolean>
}

// ── Helpers ───────────────────────────────────────────────────────────────

function generateId(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

function toNano(ms: number): string {
  return (BigInt(Math.floor(ms)) * 1_000_000n).toString()
}

function formatAttributes(attrs: Record<string, string | number | boolean>) {
  return Object.entries(attrs).map(([key, val]) => {
    if (typeof val === 'string') return { key, value: { stringValue: val } }
    if (typeof val === 'number') return { key, value: { intValue: String(val) } }
    return { key, value: { boolValue: val } }
  })
}

// ── Span Builder ──────────────────────────────────────────────────────────

export function createSpan(name: string, parentTraceId?: string): SpanContext {
  return {
    traceId: parentTraceId || generateId(16),
    spanId: generateId(8),
    startTime: Date.now(),
    events: [],
    attributes: {},
  }
}

export function addSpanEvent(
  ctx: SpanContext,
  name: string,
  attrs?: Record<string, string | number | boolean>
) {
  ctx.events.push({ name, timestamp: Date.now(), attributes: attrs })
}

export function setSpanAttribute(
  ctx: SpanContext,
  key: string,
  value: string | number | boolean
) {
  ctx.attributes[key] = value
}

// ── Exporter ──────────────────────────────────────────────────────────────

async function exportSpan(span: Span): Promise<void> {
  if (!OTEL_ENDPOINT) {
    // No endpoint configured — log to stdout for local dev
    console.log('[OTel]', JSON.stringify({
      name: span.name,
      duration_ms: (Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6).toFixed(1),
      status: span.status.code === 2 ? 'ERROR' : 'OK',
      attributes: Object.fromEntries(span.attributes.map(a => [a.key, a.value.stringValue ?? a.value.intValue ?? a.value.boolValue])),
    }))
    return
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Parse OTEL_HEADERS (format: key=value,key2=value2)
  if (OTEL_HEADERS) {
    for (const pair of OTEL_HEADERS.split(',')) {
      const [k, ...vParts] = pair.split('=')
      if (k && vParts.length > 0) headers[k.trim()] = vParts.join('=').trim()
    }
  }

  const payload = {
    resourceSpans: [{
      resource: {
        attributes: formatAttributes({
          'service.name': SERVICE_NAME,
          'service.version': SERVICE_VERSION,
          'deployment.environment': Deno.env.get('ENVIRONMENT') || 'development',
        }),
      },
      scopeSpans: [{
        scope: { name: 'edusync-otel', version: '1.0.0' },
        spans: [span],
      }],
    }],
  }

  try {
    await fetch(`${OTEL_ENDPOINT}/v1/traces`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (err) {
    // Fire-and-forget — never fail the request due to telemetry
    console.warn('[OTel] Export failed:', err)
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────

/**
 * Wraps a Deno.serve handler with automatic tracing.
 *
 * Captures:
 * - Request method, URL, status code
 * - Duration
 * - Error details (if any)
 * - Custom attributes added via req.spanContext
 *
 * @example
 * Deno.serve(withTracing('ai-grade-essay', async (req) => {
 *   addSpanEvent(req.spanContext, 'llm_call_start')
 *   const result = await gradeEssay(req)
 *   setSpanAttribute(req.spanContext, 'token_count', result.tokens)
 *   return new Response(JSON.stringify(result))
 * }))
 */
export function withTracing(
  functionName: string,
  handler: (req: Request & { spanContext: SpanContext }) => Promise<Response> | Response
) {
  return async (req: Request): Promise<Response> => {
    const spanCtx = createSpan(`${functionName}.invoke`)
    const enrichedReq = Object.assign(req, { spanContext: spanCtx })

    spanCtx.attributes['http.method'] = req.method
    spanCtx.attributes['http.url'] = new URL(req.url).pathname
    spanCtx.attributes['faas.name'] = functionName
    spanCtx.attributes['faas.trigger'] = 'http'

    let response: Response
    let statusCode = 2 // ERROR

    try {
      response = await handler(enrichedReq)
      spanCtx.attributes['http.status_code'] = response.status
      statusCode = response.status >= 400 ? 2 : 1
    } catch (err) {
      spanCtx.attributes['http.status_code'] = 500
      spanCtx.attributes['error.type'] = err instanceof Error ? err.constructor.name : 'UnknownError'
      spanCtx.attributes['error.message'] = err instanceof Error ? err.message : String(err)
      addSpanEvent(spanCtx, 'exception', {
        'exception.type': err instanceof Error ? err.constructor.name : 'Error',
        'exception.message': err instanceof Error ? err.message : String(err),
      })
      response = new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
      statusCode = 2
    }

    const endTime = Date.now()
    spanCtx.attributes['duration_ms'] = endTime - spanCtx.startTime

    // Build and export span (fire-and-forget)
    const span: Span = {
      traceId: spanCtx.traceId,
      spanId: spanCtx.spanId,
      name: `${functionName}.invoke`,
      kind: 1, // SERVER
      startTimeUnixNano: toNano(spanCtx.startTime),
      endTimeUnixNano: toNano(endTime),
      attributes: formatAttributes(spanCtx.attributes),
      events: spanCtx.events,
      status: { code: statusCode },
    }

    // Don't await — export in background
    exportSpan(span).catch(() => {})

    return response
  }
}