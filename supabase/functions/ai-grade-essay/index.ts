import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const LLM_TIMEOUT_MS = 15000 // 15s

// Ensure the user is authenticated and is a teacher or admin
async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('AUTH_MISSING')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_CONFIG_MISSING')
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser()
  if (userError || !user) throw new Error('AUTH_INVALID')

  // Get tenant_id from user metadata for multi-tenant isolation
  const tenantId = user.user_metadata?.tenant_id
  if (!tenantId) {
    throw new Error('TENANT_MISSING')
  }

  // Check role - students cannot grade essays
  const role = user.user_metadata?.role
  if (role === 'student') {
    throw new Error('UNAUTHORIZED_ROLE')
  }

  return { user, supabaseClient, tenantId }
}

// Validate that the submission belongs to the same tenant
async function validateTenantAccess(supabaseClient: any, submissionId: string, tenantId: string) {
  // Extract assignmentId from submissionId (format: assignmentId-studentId)
  const assignmentId = submissionId.split('-')[0]

  // Get the assignment to verify tenant
  const { data: assignment, error } = await supabaseClient
    .from('assignments')
    .select('tenant_id, id')
    .eq('id', assignmentId)
    .single()

  if (error || !assignment) {
    console.error('Assignment lookup error:', error)
    throw new Error('SUBMISSION_NOT_FOUND')
  }

  // Verify tenant isolation
  if (assignment.tenant_id !== tenantId) {
    console.error(`Tenant mismatch: ${assignment.tenant_id} !== ${tenantId}`)
    throw new Error('TENANT_ACCESS_DENIED')
  }

  return true
}

async function callGroq(messages: any[]) {
  const model = 'llama-3.1-70b-versatile'
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) throw new Error('GROQ_CONFIG_MISSING')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1, // Low temperature for more deterministic grading
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`GROQ_API_ERROR_${response.status}: ${errBody}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('GROQ_EMPTY_RESPONSE')

    return JSON.parse(text)
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('LLM_TIMEOUT')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

serve(async (req) => {
  // CORS Preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { user, supabaseClient, tenantId } = await authenticate(req)

    const { submissionId, essayText, rubric } = await req.json()

    if (!submissionId) {
      return errorResponse('Missing required parameter: submissionId', 400)
    }

    if (!essayText || !rubric || !Array.isArray(rubric)) {
      return errorResponse('Missing required parameters: essayText and rubric', 400)
    }

    if (essayText.length > 10000) {
      return errorResponse('Essay text exceeds maximum length of 10000 characters', 400)
    }

    // Validate tenant access - ensures the submission belongs to the same tenant
    await validateTenantAccess(supabaseClient, submissionId, tenantId)

    const rubricText = rubric
      .map(
        (r: any) =>
          `- ${r.criterion} (Max Score: ${r.maxPoints || r.maxScore}): ${r.description || ''}`
      )
      .join('\n')

    const systemPrompt = `You are an expert, strict, and fair teacher evaluating an essay.
You will evaluate the essay strictly according to the provided rubric criteria.
For each criterion, assign a score up to the max points specified and write a brief, constructive feedback note.
Finally, provide an overall feedback summary.
Always output a JSON object with exactly these three keys:
- "scores": an object mapping the exact criterion names to their numeric score.
- "feedback": an object mapping the exact criterion names to their specific feedback string.
- "overallFeedback": a string summarizing the overall feedback.

Example Output format:
{
  "scores": {
    "Tata Bahasa & Ejaan": 30,
    "Kualitas Argumen": 45
  },
  "feedback": {
    "Tata Bahasa & Ejaan": "Beberapa kesalahan minor namun tidak mengganggu pemahaman.",
    "Kualitas Argumen": "Argumen cukup kuat tetapi beberapa bukti kurang relevan."
  },
  "overallFeedback": "Tulisan yang baik dengan argumen solid, namun perhatikan lagi bukti pendukung dan ejaan."
}`

    const userPrompt = `Rubric:\n${rubricText}\n\nEssay:\n${essayText}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const aiResult = await callGroq(messages)

    // Very basic structural validation
    if (!aiResult.scores || !aiResult.feedback || !aiResult.overallFeedback) {
      throw new Error('AI_INVALID_FORMAT')
    }

    return jsonResponse(aiResult)
  } catch (err: any) {
    console.error('ai_grade_error:', err)

    if (err.message === 'UNAUTHORIZED_ROLE')
      return errorResponse('Unauthorized: Students cannot grade essays.', 403)
    if (err.message === 'AUTH_MISSING' || err.message === 'AUTH_INVALID')
      return errorResponse('Unauthorized', 401)
    if (err.message === 'TENANT_MISSING') return errorResponse('Tenant context missing', 403)
    if (err.message === 'TENANT_ACCESS_DENIED')
      return errorResponse('Access denied: Cross-tenant access is prohibited', 403)
    if (err.message === 'SUBMISSION_NOT_FOUND') return errorResponse('Submission not found', 404)
    if (err.message === 'LLM_TIMEOUT') return errorResponse('AI_GRADING_TIMEOUT', 504)

    return errorResponse('AI_GRADING_FAILED', 500)
  }
})
