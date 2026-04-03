import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

// ==========================================================================
// Edge Function: recommend-learning-path
// Returns up to 3 AI-powered (or rule-based) lesson recommendations for a
// given course, based on the student's progress signals.
// ==========================================================================

const LLM_TIMEOUT_MS = 20_000

interface ModuleRow {
  id: string
  title: string
  order: number
}

interface LessonRow {
  id: string
  title: string
  module_id: string
  order: number
  is_published: boolean
}

interface SignalRow {
  lesson_id: string
  completion_pct: number
  total_time_spent: number
  latest_quiz_score: number | null
  struggle_score: number
  is_completed: boolean
}

interface AiRecommendation {
  lesson_id: string
  lesson_title: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

interface AiResult {
  recommendations: AiRecommendation[]
}

// ─── Auth ───
async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('AUTH_MISSING', 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser()

  if (error || !user) return null

  // Tenant from app_metadata (set by trigger) — fall back to user_metadata for older accounts
  const tenantId = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id
  if (!tenantId) return null

  return { user, tenantId }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await authenticate(req)
    if (!auth) return errorResponse('AUTH_INVALID', 401)

    const { user, tenantId } = auth

    // Parse body
    let body: { course_id?: string }
    try {
      body = await req.json()
    } catch {
      return errorResponse('INVALID_BODY', 400)
    }

    const { course_id } = body
    if (!course_id) return errorResponse('COURSE_ID_REQUIRED', 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // ── 1. Fetch course modules ──
    const { data: modules } = await serviceClient
      .from('course_modules')
      .select('id, title, "order"')
      .eq('course_id', course_id)
      .eq('tenant_id', tenantId)
      .order('"order"')
      .limit(20)

    if (!modules || (modules as ModuleRow[]).length === 0) {
      return jsonResponse({ recommendations: [], generated_by: 'rule_based' })
    }

    const moduleIds = (modules as ModuleRow[]).map((m) => m.id)

    // ── 2. Fetch published lessons in course (parallel with signals) ──
    const [{ data: lessonsRaw }, { data: signalsRaw }] = await Promise.all([
      serviceClient
        .from('lessons')
        .select('id, title, module_id, "order", is_published')
        .in('module_id', moduleIds)
        .eq('tenant_id', tenantId)
        .eq('is_published', true)
        .order('"order"')
        .limit(100),
      serviceClient
        .from('student_lesson_signals')
        .select(
          'lesson_id, completion_pct, total_time_spent, latest_quiz_score, struggle_score, is_completed'
        )
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .limit(100),
    ])

    const lessons = (lessonsRaw ?? []) as LessonRow[]
    const signals = (signalsRaw ?? []) as SignalRow[]

    if (lessons.length === 0) {
      return jsonResponse({ recommendations: [], generated_by: 'rule_based' })
    }

    // ── 3. Build context maps ──
    const signalMap = new Map(signals.map((s) => [s.lesson_id, s]))

    const completedCount = lessons.filter((l) => signalMap.get(l.id)?.is_completed).length
    const totalCount = lessons.length

    const strugglingLessons = lessons.filter((l) => {
      const s = signalMap.get(l.id)
      return (
        s && (s.struggle_score > 5 || (s.latest_quiz_score !== null && s.latest_quiz_score < 60))
      )
    })

    const notStartedLessons = lessons.filter((l) => !signalMap.has(l.id)).slice(0, 5)

    // ── 4. Rule-based fallback builder ──
    function buildRuleBasedRecs(): AiRecommendation[] {
      const recs: AiRecommendation[] = []
      if (strugglingLessons.length > 0) {
        recs.push({
          lesson_id: strugglingLessons[0].id,
          lesson_title: strugglingLessons[0].title,
          reason:
            'Anda memiliki nilai rendah di pelajaran ini. Coba ulangi untuk memperkuat pemahaman.',
          priority: 'high',
        })
      }
      if (notStartedLessons.length > 0) {
        recs.push({
          lesson_id: notStartedLessons[0].id,
          lesson_title: notStartedLessons[0].title,
          reason: 'Pelajaran berikutnya yang belum dimulai. Lanjutkan perjalanan belajar kamu!',
          priority: 'medium',
        })
      }
      // Add a second not-started if we have room
      if (notStartedLessons.length > 1 && recs.length < 3) {
        recs.push({
          lesson_id: notStartedLessons[1].id,
          lesson_title: notStartedLessons[1].title,
          reason: 'Pelajaran yang belum kamu mulai. Jangan lewatkan materi ini!',
          priority: 'low',
        })
      }
      return recs.slice(0, 3)
    }

    // ── 5. Try Groq AI ──
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      return jsonResponse({
        recommendations: buildRuleBasedRecs(),
        generated_by: 'rule_based',
      })
    }

    const contextStr = [
      `Siswa telah menyelesaikan ${completedCount}/${totalCount} pelajaran.`,
      `Pelajaran dengan nilai rendah/kesulitan: ${
        strugglingLessons
          .slice(0, 3)
          .map((l) => l.title)
          .join(', ') || 'tidak ada'
      }.`,
      `Pelajaran belum dimulai berikutnya: ${
        notStartedLessons
          .slice(0, 3)
          .map((l) => l.title)
          .join(', ') || 'semua sudah dimulai'
      }.`,
    ].join('\n')

    const lessonListStr = lessons
      .slice(0, 20)
      .map((l) => `${l.id}: ${l.title}`)
      .join('\n')

    const prompt = `Kamu adalah tutor AI EduSync yang membantu siswa merencanakan jalur belajar. Berdasarkan data progres siswa berikut, berikan maksimal 3 rekomendasi pelajaran yang harus diprioritaskan.

${contextStr}

Daftar pelajaran yang tersedia (id: judul):
${lessonListStr}

Kembalikan HANYA JSON valid (tidak ada teks lain):
{
  "recommendations": [
    { "lesson_id": "uuid", "lesson_title": "Judul pelajaran", "reason": "Alasan rekomendasi singkat dalam 1 kalimat Bahasa Indonesia", "priority": "high|medium|low" }
  ]
}`

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
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
          max_tokens: 512,
        }),
      })
      clearTimeout(timeout)

      if (!response.ok) {
        // Groq error — fall back to rule-based
        return jsonResponse({
          recommendations: buildRuleBasedRecs(),
          generated_by: 'rule_based',
        })
      }

      const data = await response.json()
      const rawContent = data?.choices?.[0]?.message?.content
      if (!rawContent) {
        return jsonResponse({
          recommendations: buildRuleBasedRecs(),
          generated_by: 'rule_based',
        })
      }

      let aiResult: AiResult
      try {
        aiResult = JSON.parse(rawContent) as AiResult
      } catch {
        return jsonResponse({
          recommendations: buildRuleBasedRecs(),
          generated_by: 'rule_based',
        })
      }

      const recs = (aiResult?.recommendations ?? []).slice(0, 3)

      // Validate that lesson_ids returned by AI actually exist in our lessons list
      const lessonIdSet = new Set(lessons.map((l) => l.id))
      const validRecs = recs.filter((r) => lessonIdSet.has(r.lesson_id))

      // If AI returned garbage IDs, fall back
      if (validRecs.length === 0) {
        return jsonResponse({
          recommendations: buildRuleBasedRecs(),
          generated_by: 'rule_based',
        })
      }

      return jsonResponse({ recommendations: validRecs, generated_by: 'ai' })
    } catch {
      clearTimeout(timeout)
      return jsonResponse({
        recommendations: buildRuleBasedRecs(),
        generated_by: 'rule_based',
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[recommend-learning-path] error:', msg)
    return errorResponse('Terjadi kesalahan server', 500)
  }
})
