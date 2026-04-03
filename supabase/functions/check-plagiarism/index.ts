import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, jsonResponse } from '../_shared/response.ts'

/**
 * Cosine-similarity based text comparison (bag-of-words, Jaccard variant).
 * Returns a value between 0.0 (no overlap) and 1.0 (identical).
 */
function cosineSimilarity(a: string, b: string): number {
  const words = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)

  const setA = new Set(words(a))
  const setB = new Set(words(b))
  const intersection = [...setA].filter((w) => setB.has(w)).length
  const union = setA.size + setB.size - intersection
  if (union === 0) return 0
  return intersection / union
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('AUTH_MISSING', 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user identity using anon key + JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return errorResponse('AUTH_INVALID', 401)

    const tenantId = user.user_metadata?.tenant_id
    const role = user.user_metadata?.role
    if (!tenantId) return errorResponse('TENANT_MISSING', 400)
    if (role === 'student') return errorResponse('UNAUTHORIZED_ROLE', 403)

    const body = await req.json()
    const { submission_id } = body
    if (!submission_id) return errorResponse('SUBMISSION_ID_REQUIRED', 400)

    const serviceClient = createClient(supabaseUrl, serviceKey)

    // Fetch target submission — enforce tenant isolation
    const { data: target } = await serviceClient
      .from('assignment_submissions')
      .select('id, assignment_id, submission_text, student_id, tenant_id')
      .eq('id', submission_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!target) return errorResponse('SUBMISSION_NOT_FOUND', 404)

    // Mark as processing immediately so the UI can show progress
    await serviceClient.from('plagiarism_checks').upsert(
      {
        submission_id,
        status: 'processing',
        provider: 'internal',
        checked_by: user.id,
        tenant_id: tenantId,
      },
      { onConflict: 'submission_id' }
    )

    // Short texts can't be meaningfully compared
    if (!target.submission_text || target.submission_text.trim().length < 50) {
      await serviceClient
        .from('plagiarism_checks')
        .update({
          status: 'completed',
          similarity_score: 0,
          report_data: { note: 'Teks terlalu pendek untuk diperiksa', total_compared: 0 },
          updated_at: new Date().toISOString(),
        })
        .eq('submission_id', submission_id)

      return jsonResponse({ similarity_score: 0, status: 'completed', matches: [] })
    }

    // Fetch other submissions for the same assignment (within same tenant)
    const { data: others } = await serviceClient
      .from('assignment_submissions')
      .select('id, submission_text, student_id')
      .eq('assignment_id', target.assignment_id)
      .eq('tenant_id', tenantId)
      .neq('id', submission_id)
      .not('submission_text', 'is', null)
      .limit(50)

    let maxSimilarity = 0
    const matches: Array<{ submission_id: string; similarity: number }> = []

    for (const other of others ?? []) {
      if (!other.submission_text) continue
      const sim = cosineSimilarity(target.submission_text, other.submission_text)
      if (sim > 0.3) {
        matches.push({ submission_id: other.id, similarity: Math.round(sim * 100) })
      }
      maxSimilarity = Math.max(maxSimilarity, sim)
    }

    // Sort matches descending by similarity
    matches.sort((a, b) => b.similarity - a.similarity)

    const finalScore = Math.round(maxSimilarity * 100)

    await serviceClient
      .from('plagiarism_checks')
      .update({
        status: 'completed',
        similarity_score: finalScore,
        report_data: {
          matches: matches.slice(0, 5),
          total_compared: others?.length ?? 0,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('submission_id', submission_id)

    return jsonResponse({
      similarity_score: finalScore,
      status: 'completed',
      matches: matches.slice(0, 5),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
