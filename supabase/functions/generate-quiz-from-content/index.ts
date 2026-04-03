import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const LLM_TIMEOUT_MS = 25000

async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('AUTH_MISSING')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser()
  if (error || !user) throw new Error('AUTH_INVALID')

  // Resolve tenant_id and role from user_roles table (not metadata)
  const { data: roleData } = await supabaseClient
    .from('user_roles')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single()

  const tenantId = roleData?.tenant_id
  if (!tenantId) throw new Error('TENANT_MISSING')

  const role = roleData?.role
  if (role === 'student') throw new Error('UNAUTHORIZED_ROLE')

  return { user, supabaseClient, tenantId }
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { tenantId } = await authenticate(req)
    const body = await req.json()
    const { lesson_id, question_count = 5, question_types = ['MCQ'], difficulty = 'medium' } = body

    if (!lesson_id) return errorResponse('LESSON_ID_REQUIRED', 400)
    if (question_count < 1 || question_count > 20)
      return errorResponse('INVALID_QUESTION_COUNT', 400)

    // Use service role to bypass RLS for content fetching
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: lesson } = await serviceClient
      .from('lessons')
      .select('id, title, content')
      .eq('id', lesson_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!lesson) return errorResponse('LESSON_NOT_FOUND', 404)

    const { data: resources } = await serviceClient
      .from('lesson_resources')
      .select('type, title, content')
      .eq('lesson_id', lesson_id)
      .eq('tenant_id', tenantId)
      .in('type', ['VIDEO', 'DOCUMENT', 'PDF', 'LINK'])
      .limit(5)

    const contentText = [
      lesson.content || '',
      ...((resources || []) as Array<{ type: string; title: string; content: string | null }>).map(
        (r) => r.content || r.title || ''
      ),
    ]
      .join('\n\n')
      .slice(0, 3000)

    if (contentText.trim().length < 50) {
      return errorResponse('INSUFFICIENT_CONTENT', 400)
    }

    const typeLabels: Record<string, string> = {
      MCQ: 'Pilihan ganda (4 opsi, 1 benar)',
      TRUE_FALSE: 'Benar/Salah',
      MULTIPLE_SELECT: 'Pilih semua yang benar (beberapa opsi benar)',
      SHORT_ANSWER: 'Jawaban singkat',
    }

    const typesDesc = (question_types as string[]).map((t) => typeLabels[t] || t).join(', ')

    const difficultyLabel: Record<string, string> = {
      easy: 'mudah',
      medium: 'sedang',
      hard: 'sulit',
    }

    const prompt = `Kamu adalah pembuat soal kuis yang ahli. Berdasarkan materi pelajaran berikut, buat ${question_count} soal kuis dalam Bahasa Indonesia.

MATERI PELAJARAN: "${lesson.title}"
${contentText}

INSTRUKSI:
- Buat tepat ${question_count} soal
- Tipe soal: ${typesDesc}
- Tingkat kesulitan: ${difficultyLabel[difficulty] || 'sedang'}
- Soal harus relevan dengan materi di atas
- Jawaban harus dapat ditemukan dalam materi
- Berikan penjelasan singkat untuk setiap jawaban benar

KEMBALIKAN HANYA JSON dengan format ini (tidak ada teks lain):
{
  "questions": [
    {
      "text": "Teks pertanyaan",
      "question_type": "MCQ",
      "points": 10,
      "explanation": "Penjelasan mengapa jawaban ini benar",
      "options": [
        { "text": "Opsi A", "is_correct": true },
        { "text": "Opsi B", "is_correct": false },
        { "text": "Opsi C", "is_correct": false },
        { "text": "Opsi D", "is_correct": false }
      ]
    }
  ]
}`

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return errorResponse('AI_CONFIG_MISSING', 500)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

    interface GeneratedQuestion {
      text: string
      question_type: string
      points: number
      explanation: string
      options: Array<{ text: string; is_correct: boolean }>
    }
    interface AIResponse {
      questions: GeneratedQuestion[]
    }

    let aiResponse: AIResponse
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })
      clearTimeout(timeout)
      const data = await response.json()
      aiResponse = JSON.parse(data.choices[0].message.content) as AIResponse
    } catch (_e) {
      clearTimeout(timeout)
      return errorResponse('AI_GENERATION_FAILED', 500)
    }

    if (!aiResponse?.questions || !Array.isArray(aiResponse.questions)) {
      return errorResponse('AI_INVALID_RESPONSE', 500)
    }

    return jsonResponse({
      questions: aiResponse.questions.slice(0, question_count),
      lesson_title: lesson.title,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'AUTH_MISSING' || msg === 'AUTH_INVALID') return errorResponse(msg, 401)
    if (msg === 'UNAUTHORIZED_ROLE') return errorResponse(msg, 403)
    if (msg === 'TENANT_MISSING') return errorResponse(msg, 403)
    return errorResponse(msg, 500)
  }
})
