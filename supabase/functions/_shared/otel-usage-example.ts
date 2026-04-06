// ==========================================================================
// Usage Example: How to instrument an Edge Function with OTel
// ==========================================================================
//
// Before (without OTel):
//   Deno.serve(async (req) => { ... })
//
// After (with OTel):
//   import { withTracing, addSpanEvent, setSpanAttribute } from '../_shared/otel.ts'
//   Deno.serve(withTracing('ai-grade-essay', async (req) => {
//     addSpanEvent(req.spanContext, 'openai_call_start')
//     const result = await callOpenAI(prompt)
//     setSpanAttribute(req.spanContext, 'openai.tokens', result.usage.total_tokens)
//     setSpanAttribute(req.spanContext, 'openai.model', 'gpt-4o-mini')
//     addSpanEvent(req.spanContext, 'openai_call_end')
//     return new Response(JSON.stringify(result))
//   }))
//
// Environment Variables (set in Supabase Dashboard > Edge Functions > Secrets):
//   OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.example.com
//   OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer xxx
//   SERVICE_VERSION=v0.3
//   ENVIRONMENT=production
//
// When OTEL_EXPORTER_OTLP_ENDPOINT is not set, spans are logged to stdout.
// ==========================================================================

export {}