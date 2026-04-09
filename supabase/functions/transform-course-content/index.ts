import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

import { corsHeaders, handleCors } from '../_shared/cors.ts'

const LLM_TIMEOUT_MS = 25_000
const RATE_LIMIT_PER_HOUR = 30
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

// ─── Transform Action Prompts ─────────────────────────────────────────────────

type TransformAction =
  | 'summarize'
  | 'expand'
  | 'simplify'
  | 'tone-rewrite'
  | 'grade-align'
  | 'quiz-seed'
  | 'assignment-brief'

const VALID_ACTIONS: TransformAction[] = [
  'summarize',
  'expand',
  'simplify',
  'tone-rewrite',
  'grade-align',
  'quiz-seed',
  'assignment-brief',
]

function buildTransformPrompt(
  content: string,
  action: TransformAction,
  context?: { lesson_title?: string; subject?: string; grade_level?: string }
): string {
  const lessonLine = context?.lesson_title ? `\nPelajaran: ${context.lesson_title}` : ''
  const subjectLine = context?.subject ? `\nMata Pelajaran: ${context.subject}` : ''
  const gradeLine = context?.grade_level ? `\nTingkat/Kelas: ${context.grade_level}` : ''
  const contextHeader = `${lessonLine}${subjectLine}${gradeLine}`

  const prompts: Record<TransformAction, string> = {
    summarize: `Kamu adalah asisten ringkasan konten untuk guru Indonesia. Berikan respons HANYA dalam format JSON yang valid.
${contextHeader}

KONTEN ASLI:
${content}

INSTRUKSI:
- Ringkas konten di atas menjadi versi yang lebih singkat dan padat
- Pertahankan poin-poin kunci dan informasi penting
- Gunakan Bahasa Indonesia yang jelas dan ringkas
- Hasilkan sekitar 30-40% dari panjang asli

FORMAT JSON:
{"transformed_content":"Konten yang telah diringkas..."}`,

    expand: `Kamu adalah penulis konten pembelajaran untuk guru Indonesia. Berikan respons HANYA dalam format JSON yang valid.
${contextHeader}

KONTEN ASLI:
${content}

INSTRUKSI:
- Perluas konten dengan penjelasan lebih detail, contoh, dan ilustrasi
- Tambahkan konteks dan informasi pendukung
- Gunakan Bahasa Indonesia yang informatif dan mudah dipahami
- Hasilkan sekitar 2-3 kali panjang asli

FORMAT JSON:
{"transformed_content":"Konten yang telah diperluas..."}`,

    simplify: `Kamu adalah guru yang menyederhanakan materi untuk siswa Indonesia. Berikan respons HANYA dalam format JSON yang valid.
${contextHeader}

KONTEN ASLI:
${content}

INSTRUKSI:
- Sederhanakan bahasa dan istilah yang kompleks
- Gunakan kalimat pendek dan langsung
- Tambahkan analogi sederhana jika membantu
- Pertahankan semua informasi penting
- Bahasa Indonesia yang mudah dipahami oleh siswa

FORMAT JSON:
{"transformed_content":"Konten yang telah disederhanakan..."}`,

    'tone-rewrite': `Kamu adalah editor konten pembelajaran Indonesia. Berikan respons HANYA dalam format JSON yang valid.
${contextHeader}

KONTEN ASLI:
${content}

INSTRUKSI:
- Tulis ulang dengan nada yang lebih formal dan akademis
- Gunakan bahasa baku dan struktur kalimat yang rapi
- Pertahankan semua informasi dan makna asli
- Cocok untuk konteks pembelajaran di sekolah Indonesia

FORMAT JSON:
{"transformed_content":"Konten yang telah ditulis ulang..."}`,

    'grade-align': `Kamu adalah ahli kurikulum pendidikan Indonesia. Berikan respons HANYA dalam format JSON yang valid.
${contextHeader}

KONTEN ASLI:
${content}

INSTRUKSI:
- Sesuaikan tingkat bahasa dan kompleksitas dengan tingkat kelas yang disebutkan
- Jika tidak ada kelas yang disebutkan, sesuaikan untuk SMP (kelas 7-9)
- Pastikan kosakata, contoh, dan kedalaman materi sesuai usia
- Pertahankan akurasi informasi

FORMAT JSON:
{"transformed_content":"Konten yang disesuaikan tingkat kelasnya..."}`,

    'quiz-seed': `Kamu adalah pembuat soal kuis untuk guru Indonesia. Berikan respons HANYA dalam format JSON yang valid.
${contextHeader}

KONTEN SUMBER:
${content}

INSTRUKSI:
- Buat 3 soal pilihan ganda berdasarkan konten di atas
- Dalam Bahasa Indonesia
- Setiap soal memiliki 4 opsi, 1 jawaban benar
- Sertakan penjelasan singkat

FORMAT JSON:
{"quiz_payload":{"title":"Kuis dari Konten","questions":[{"text":"Pertanyaan?","options":["A","B","C","D"],"answer":0,"explanation":"Alasan"}]}}`,

    'assignment-brief': `Kamu adalah perancang tugas untuk guru Indonesia. Berikan respons HANYA dalam format JSON yang valid.
${contextHeader}

KONTEN SUMBER:
${content}

INSTRUKSI:
- Buat brief tugas/assignment berdasarkan konten di atas
- Dalam Bahasa Indonesia
- Sertakan judul, instruksi detail, dan skor maksimal
- Tugas harus mendorong pemahaman mendalam materi

FORMAT JSON:
{"assignment_payload":{"title":"Judul Tugas","instructions":"Instruksi detail tugas...","max_points":100}}`,
  }

  return prompts[action]
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
        assignment_type: 'transform',
        bloom_level: 'N/A',
        question_count: 0,
        file_name: 'content_transform',
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
      block_content,
      action,
      context,
    } = body as {
      course_id: string
      block_content: string
      action: string
      context?: {
        lesson_title?: string
        block_type?: string
        subject?: string
        grade_level?: string
        block_id?: string
      }
    }

    if (!course_id) return err('COURSE_ID_REQUIRED', 400)
    if (!block_content || block_content.trim().length < 10)
      return err('CONTENT_TOO_SHORT', 400)
    if (block_content.length > MAX_FIELD_CHARS) return err('CONTENT_TOO_LONG', 400)
    if (!action || !VALID_ACTIONS.includes(action as TransformAction))
      return err('INVALID_ACTION', 400)
    if (context?.lesson_title && context.lesson_title.length > MAX_FIELD_CHARS) {
      return err('LESSON_TITLE_TOO_LONG', 400)
    }
    if (context?.subject && context.subject.length > MAX_FIELD_CHARS) {
      return err('SUBJECT_TOO_LONG', 400)
    }
    if (context?.grade_level && context.grade_level.length > MAX_FIELD_CHARS) {
      return err('GRADE_LEVEL_TOO_LONG', 400)
    }

    // 3. Course access + rate limiting
    await assertCourseAccess(serviceClient, course_id, userId, tenantId)
    await checkRateLimit(serviceClient, userId, tenantId)

    // 4. Call Groq LLM
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      await logAttempt('error', null, 'AI_CONFIG_MISSING')
      return err('AI_CONFIG_MISSING', 500)
    }

    const prompt = buildTransformPrompt(
      block_content.slice(0, 4000),
      action as TransformAction,
      context
    )

    if (prompt.length > MAX_PROMPT_CHARS) {
      await logAttempt('error', null, 'PROMPT_TOO_LONG')
      return err('PROMPT_TOO_LONG', 400)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

    let transformResult: Record<string, unknown>
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
          temperature: 0.3,
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
      transformResult = JSON.parse(rawContent) as Record<string, unknown>
    } catch (e) {
      clearTimeout(timeout)
      const msg = e instanceof Error ? e.message : String(e)
      const isTimeout = msg.includes('AbortError') || msg.includes('abort')
      await logAttempt('error', null, isTimeout ? 'LLM_TIMEOUT' : 'AI_GENERATION_FAILED')
      return err(isTimeout ? 'AI_TIMEOUT' : 'AI_GENERATION_FAILED', 502)
    }

    // 5. Persist artifact
    const { data: artifact, error: saveError } = await serviceClient
      .from('ai_builder_artifacts')
      .insert({
        tenant_id: tenantId,
        course_id,
        created_by: userId,
        artifact_kind: 'transform',
        target_type: 'block',
        target_id: context?.block_id ?? null,
        source_type: 'prompt',
        prompt_config: {
          action,
          block_content_length: block_content.length,
          context,
        },
        output: transformResult,
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
      result: transformResult,
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

    console.error('Unhandled error in transform-course-content:', e)
    await logAttempt('error', null, msg)
    return err('INTERNAL_ERROR', 500)
  }
})
