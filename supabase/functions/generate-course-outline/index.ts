import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

import { corsHeaders, handleCors } from '../_shared/cors.ts'

const LLM_TIMEOUT_MS = 30_000
const RATE_LIMIT_PER_HOUR = 20
const MODEL = 'llama-3.1-70b-versatile'
const MAX_PROMPT_CHARS = 10_000
const MAX_FIELD_CHARS = 5_000

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 500): Response {
  return json({ error: message }, status)
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function authenticate(req: Request): Promise<{ userId: string; tenantId: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('AUTH_MISSING')

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser()
  if (error || !user) throw new Error('AUTH_INVALID')

  const { data: roleData } = await supabaseClient
    .from('user_roles')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single()

  if (!roleData?.tenant_id) throw new Error('TENANT_MISSING')
  if (roleData.role === 'student') throw new Error('UNAUTHORIZED_ROLE')

  return { userId: user.id, tenantId: roleData.tenant_id }
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

async function checkRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  tenantId: string
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await serviceClient
    .from('ai_generation_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'success')
    .gte('created_at', oneHourAgo)

  if (error) {
    console.warn('Rate limit check failed:', error.message)
    return
  }

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    throw new Error('RATE_LIMITED')
  }
}

async function assertCourseAccess(
  serviceClient: ReturnType<typeof createClient>,
  courseId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  const { count: creatorCount, error: creatorError } = await serviceClient
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('id', courseId)
    .eq('tenant_id', tenantId)
    .eq('created_by', userId)
    .limit(1)

  if (creatorError) {
    throw new Error('COURSE_ACCESS_CHECK_FAILED')
  }

  if ((creatorCount ?? 0) > 0) return

  const { count: collaboratorCount, error: collaboratorError } = await serviceClient
    .from('course_collaborators')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (collaboratorError) {
    throw new Error('COURSE_ACCESS_CHECK_FAILED')
  }

  if ((collaboratorCount ?? 0) === 0) {
    throw new Error('FORBIDDEN_NO_COURSE_ACCESS')
  }
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildOutlinePrompt(
  courseTitle: string,
  courseDescription: string,
  subject: string,
  gradeLevel: string,
  targetModuleCount: number,
  targetLessonCount: number
): string {
  const subjectLine = subject ? `\nMata Pelajaran: ${subject}` : ''
  const gradeLine = gradeLevel ? `\nTingkat/Kelas: ${gradeLevel}` : ''

  return `Kamu adalah perancang kurikulum profesional untuk sekolah di Indonesia. Berikan respons HANYA dalam format JSON yang valid.

JUDUL KURSUS: ${courseTitle}
DESKRIPSI: ${courseDescription || '(tidak ada deskripsi)'}${subjectLine}${gradeLine}

INSTRUKSI:
- Buat kerangka kursus (outline) dalam Bahasa Indonesia
- Buat tepat ${targetModuleCount} modul
- Setiap modul memiliki ${targetLessonCount} pelajaran
- Setiap pelajaran memiliki judul, tipe (article/video/quiz), dan estimasi durasi dalam menit
- Tipe pelajaran harus bervariasi dan sesuai konteks:
  - "article" untuk materi bacaan/teori
  - "video" untuk demonstrasi/visual
  - "quiz" untuk evaluasi/latihan
- Durasi realistis: artikel 10–20 menit, video 5–15 menit, kuis 10–30 menit
- Urutan pelajaran harus progresif dari dasar ke lanjutan

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"modules":[{"title":"Judul Modul","lessons":[{"title":"Judul Pelajaran","type":"article","duration_minutes":15}]}]}`
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsResp = handleCors(req)
  if (corsResp) return corsResp

  const startTime = Date.now()
  let userId: string | undefined
  let tenantId: string | undefined

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  async function logAttempt(
    status: 'success' | 'error' | 'rate_limited',
    generationId: string | null = null,
    errorMessage: string | null = null
  ): Promise<void> {
    if (!userId || !tenantId) return
    await serviceClient
      .from('ai_generation_logs')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        generation_id: generationId,
        assignment_type: 'outline',
        bloom_level: 'N/A',
        question_count: 0,
        file_name: 'outline_generation',
        processing_ms: Date.now() - startTime,
        model: MODEL,
        status,
        error_message: errorMessage,
      })
      .catch((e: unknown) => console.error('Log insert failed:', e))
  }

  try {
    // 1. Auth + role check
    const auth = await authenticate(req)
    userId = auth.userId
    tenantId = auth.tenantId

    // 2. Parse request body
    const body = await req.json()
    const {
      course_id,
      course_title,
      course_description = '',
      subject = '',
      grade_level = '',
      target_module_count = 4,
      target_lesson_count = 3,
    } = body as {
      course_id: string
      course_title: string
      course_description?: string
      subject?: string
      grade_level?: string
      target_module_count?: number
      target_lesson_count?: number
    }

    if (!course_id) return err('COURSE_ID_REQUIRED', 400)
    if (!course_title || course_title.trim().length < 3) return err('COURSE_TITLE_REQUIRED', 400)
    if (course_title.length > MAX_FIELD_CHARS) return err('COURSE_TITLE_TOO_LONG', 400)
    if (course_description && course_description.length > MAX_FIELD_CHARS) {
      return err('COURSE_DESCRIPTION_TOO_LONG', 400)
    }
    if (subject && subject.length > MAX_FIELD_CHARS) return err('SUBJECT_TOO_LONG', 400)
    if (grade_level && grade_level.length > MAX_FIELD_CHARS) return err('GRADE_LEVEL_TOO_LONG', 400)

    const moduleCount = Math.min(Math.max(target_module_count, 1), 10)
    const lessonCount = Math.min(Math.max(target_lesson_count, 1), 8)

    // 3. Course access + rate limiting
    await assertCourseAccess(serviceClient, course_id, userId, tenantId)
    await checkRateLimit(serviceClient, userId, tenantId)

    // 4. Call Groq LLM
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      await logAttempt('error', null, 'AI_CONFIG_MISSING')
      return err('AI_CONFIG_MISSING', 500)
    }

    const prompt = buildOutlinePrompt(
      course_title,
      course_description,
      subject,
      grade_level,
      moduleCount,
      lessonCount
    )

    if (prompt.length > MAX_PROMPT_CHARS) {
      await logAttempt('error', null, 'PROMPT_TOO_LONG')
      return err('PROMPT_TOO_LONG', 400)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

    interface OutlineLesson {
      title: string
      type: string
      duration_minutes: number
    }
    interface OutlineModule {
      title: string
      lessons: OutlineLesson[]
    }
    interface OutlineResult {
      modules: OutlineModule[]
    }

    let outlineResult: OutlineResult
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          response_format: { type: 'json_object' },
          max_tokens: 4096,
        }),
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const respBody = await response.text().catch(() => '')
        console.error('Groq API error:', response.status, respBody)
        await logAttempt('error', null, `GROQ_${response.status}`)
        return err('AI_GENERATION_FAILED', 502)
      }

      const data = await response.json()
      const rawContent: string = data?.choices?.[0]?.message?.content ?? ''
      outlineResult = JSON.parse(rawContent) as OutlineResult
    } catch (e) {
      clearTimeout(timeout)
      const msg = e instanceof Error ? e.message : String(e)
      const isTimeout = msg.includes('AbortError') || msg.includes('abort')
      await logAttempt('error', null, isTimeout ? 'LLM_TIMEOUT' : 'AI_GENERATION_FAILED')
      return err(isTimeout ? 'AI_TIMEOUT' : 'AI_GENERATION_FAILED', 502)
    }

    if (!outlineResult?.modules || !Array.isArray(outlineResult.modules)) {
      await logAttempt('error', null, 'AI_INVALID_RESPONSE')
      return err('AI_INVALID_RESPONSE', 502)
    }

    // Sanitize output
    const modules = outlineResult.modules.slice(0, moduleCount).map((mod) => ({
      title: String(mod.title || 'Modul Baru'),
      lessons: (mod.lessons || []).slice(0, lessonCount).map((les) => ({
        title: String(les.title || 'Pelajaran Baru'),
        type: ['article', 'video', 'quiz'].includes(les.type) ? les.type : 'article',
        duration_minutes: Math.min(Math.max(Number(les.duration_minutes) || 15, 5), 120),
      })),
    }))

    // 5. Persist artifact
    const { data: artifact, error: saveError } = await serviceClient
      .from('ai_builder_artifacts')
      .insert({
        tenant_id: tenantId,
        course_id,
        created_by: userId,
        artifact_kind: 'outline',
        target_type: 'course',
        target_id: course_id,
        source_type: 'prompt',
        prompt_config: {
          course_title,
          course_description,
          subject,
          grade_level,
          target_module_count: moduleCount,
          target_lesson_count: lessonCount,
        },
        output: { modules },
        status: 'generated',
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('Artifact save error (non-fatal):', saveError.message)
    }

    // 6. Log success
    await logAttempt('success', null)

    return json({
      artifact_id: artifact?.id ?? null,
      outline: { modules },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)

    if (msg === 'AUTH_MISSING' || msg === 'AUTH_INVALID') return err(msg, 401)
    if (msg === 'UNAUTHORIZED_ROLE') return err(msg, 403)
    if (msg === 'TENANT_MISSING') return err(msg, 403)
    if (msg === 'FORBIDDEN_NO_COURSE_ACCESS') return err(msg, 403)
    if (msg === 'RATE_LIMITED') {
      await logAttempt('rate_limited', null, msg)
      return err(msg, 429)
    }

    console.error('Unhandled error in generate-course-outline:', e)
    await logAttempt('error', null, msg)
    return err('INTERNAL_ERROR', 500)
  }
})
