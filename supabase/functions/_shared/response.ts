// Shared response helpers for EduSync Edge Functions
import { corsHeaders } from './cors.ts'

/**
 * Returns a JSON response with CORS headers.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

/**
 * Returns a JSON error response with CORS headers.
 */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status)
}
