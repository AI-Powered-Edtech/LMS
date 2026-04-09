import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

import { corsHeaders, handleCors } from '../_shared/cors.ts'

const LLM_TIMEOUT_MS = 30_000
const RATE_LIMIT_PER_HOUR = 20
const MODEL = 'llama-3.1-70b-versatile'
const MAX_CONTEXT_CHARS = 6_000
const MAX_PROMPT_CHARS = 10_000
const MAX_FIELD_CHARS = 5_000
type DraftMode = 'lesson_draft' | 'quiz' | 'reading' | 'writing'

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

// ─── Context Gathering ────────────────────────────────────────────────────────

async function gatherLessonContext(
  serviceClient: ReturnType<typeof createClient>,
  lessonId: string,
  tenantId: string
): Promise<{ lessonTitle: string; context: string }> {
  // Fetch lesson
  const { data: lesson } = await serviceClient
    .from('lessons')
    .select('title, content, type')
    .eq('id', lessonId)
    .eq('tenant_id', tenantId)
    .single()

  if (!lesson) throw new Error('LESSON_NOT_FOUND')

  const parts: string[] = []

  if (lesson.content) {
    parts.push(`[KONTEN PELAJARAN]\n${lesson.content}`)
  }

  // Fetch lesson resources (up to 5)
  const { data: resources } = await serviceClient
    .from('lesson_resources')
    .select('type, title, content')
    .eq('lesson_id', lessonId)
    .eq('tenant_id', tenantId)
    .order('order_index', { ascending: true })
    .limit(5)

  if (resources) {
    for (const res of resources) {
      if (res.content) {
        parts.push(`[${res.type}${res.title ? ': ' + res.title : ''}]\n${res.content}`)
      }
    }
  }

  // Fetch existing quiz/assignment titles for context
  const { data: quizzes } = await serviceClient
    .from('quizzes')
    .select('title')
    .eq('lesson_id', lessonId)
    .eq('tenant_id', tenantId)
    .limit(1)

  const { data: assignments } = await serviceClient
    .from('assignments')
    .select('title')
    .eq('lesson_id', lessonId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (quizzes?.length) {
    parts.push(`[KUIS YANG ADA: ${quizzes[0].title}]`)
  }
  if (assignments?.length) {
    parts.push(`[TUGAS YANG ADA: ${assignments[0].title}]`)
  }

  const context = parts.join('\n\n').slice(0, MAX_CONTEXT_CHARS)
  return { lessonTitle: lesson.title, context }
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function resolveDraftMode(contentTypes?: string[]): DraftMode {
  const requested = contentTypes?.find((type) =>
    ['quiz', 'reading', 'writing', 'lesson_draft'].includes(type)
  )

  if (requested === 'quiz' || requested === 'reading' || requested === 'writing') {
    return requested
  }

  return 'lesson_draft'
}

function buildLessonDraftPrompt(
  lessonTitle: string,
  context: string,
  subject: string,
  gradeLevel: string,
  mode: DraftMode
): string {
  const subjectLine = subject ? `\nMata Pelajaran: ${subject}` : ''
  const gradeLine = gradeLevel ? `\nTingkat/Kelas: ${gradeLevel}` : ''
  const header = `JUDUL PELAJARAN: ${lessonTitle}${subjectLine}${gradeLine}

KONTEKS YANG SUDAH ADA:
${context || '(belum ada konten)'}`

  if (mode === 'quiz') {
    return `Kamu adalah penyusun kuis sekolah profesional untuk guru Indonesia. Berikan respons HANYA dalam format JSON yang valid.

${header}

INSTRUKSI:
- Buat kuis pilihan ganda dalam Bahasa Indonesia berdasarkan konteks pelajaran
- Hasilkan 5 soal pilihan ganda
- Setiap soal memiliki 4 opsi dengan tepat 1 jawaban benar
- Gunakan tingkat kesulitan menengah dan relevan dengan materi
- Sertakan penjelasan singkat untuk tiap jawaban

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"quiz_payload":{"title":"Kuis ${lessonTitle}","instructions":"Kerjakan kuis berikut berdasarkan materi yang telah dipelajari.","max_attempts":1,"passing_score":70,"status":"draft","mode":"graded","questions":[{"text":"Pertanyaan?","order":1,"question_type":"MCQ","points":10,"explanation":"Penjelasan singkat","options":[{"text":"Opsi A","is_correct":true},{"text":"Opsi B","is_correct":false},{"text":"Opsi C","is_correct":false},{"text":"Opsi D","is_correct":false}]}]}}`
  }

  if (mode === 'reading') {
    return `Kamu adalah penulis bahan bacaan pembelajaran untuk sekolah di Indonesia. Berikan respons HANYA dalam format JSON yang valid.

${header}

INSTRUKSI:
- Buat 1-2 blok bacaan dalam Bahasa Indonesia
- Setiap blok bertipe TEXT dengan judul yang jelas
- Gunakan format markdown yang mudah diedit guru
- Konten harus cocok sebagai materi bacaan atau pemantik diskusi

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"blocks":[{"type":"text","title":"Bacaan Utama","content":"Konten bacaan dalam format markdown..."}]}`
  }

  if (mode === 'writing') {
    return `Kamu adalah perancang tugas menulis untuk sekolah di Indonesia. Berikan respons HANYA dalam format JSON yang valid.

${header}

INSTRUKSI:
- Buat brief tugas menulis/esai dalam Bahasa Indonesia
- Berikan judul tugas yang jelas
- Tulis instruksi rinci, terstruktur, dan mudah dipahami siswa
- Tetapkan skor maksimal 100 dan maksimal 1 percobaan

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"assignment_payload":{"title":"Tugas ${lessonTitle}","instructions":"Instruksi tugas secara rinci...","max_points":100,"max_attempts":1}}`
  }

  return `Kamu adalah penulis konten pembelajaran profesional untuk sekolah di Indonesia. Berikan respons HANYA dalam format JSON yang valid.

${header}

INSTRUKSI:
- Buat draft konten pelajaran dalam Bahasa Indonesia
- Hasilkan 3–5 blok teks yang terstruktur (pendahuluan, isi materi, ringkasan)
- Setiap blok harus memiliki judul dan konten dalam format markdown
- Konten harus informatif, relevan, dan sesuai konteks
- Jika ada konteks yang sudah ada, konten baru harus melengkapi bukan mengulangi
- Tambahkan saran asesmen opsional (judul kuis dan/atau judul & instruksi tugas)

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"blocks":[{"type":"TEXT","title":"Judul Blok","content":"Konten markdown..."}],"assessment_suggestions":{"quiz_title":"Judul Kuis Opsional","assignment_title":"Judul Tugas Opsional","assignment_instructions":"Instruksi tugas opsional"}}`
}

function sanitizeBlocks(
  rawBlocks: unknown
): Array<{ type: string; title: string | null; content: string }> {
  if (!Array.isArray(rawBlocks)) return []

  return rawBlocks.slice(0, 8).map((block, index) => {
    const entry =
      typeof block === 'object' && block !== null ? (block as Record<string, unknown>) : {}
    return {
      type: 'text',
      title:
        typeof entry.title === 'string' && entry.title.trim().length > 0
          ? entry.title.trim()
          : `Blok ${index + 1}`,
      content: typeof entry.content === 'string' ? entry.content : '',
    }
  })
}

function sanitizeQuizPayload(
  rawPayload: unknown,
  lessonTitle: string
): Record<string, unknown> | null {
  if (!rawPayload || typeof rawPayload !== 'object') return null

  const payload = rawPayload as Record<string, unknown>
  const rawQuestions = Array.isArray(payload.questions) ? payload.questions : []
  if (rawQuestions.length === 0) return null

  const questions = rawQuestions.slice(0, 10).map((question, index) => {
    const item =
      typeof question === 'object' && question !== null ? (question as Record<string, unknown>) : {}
    const rawOptions = Array.isArray(item.options) ? item.options : []

    let options = rawOptions.slice(0, 4).map((option, optionIndex) => {
      const optionItem =
        typeof option === 'object' && option !== null ? (option as Record<string, unknown>) : {}
      return {
        text:
          typeof optionItem.text === 'string' && optionItem.text.trim().length > 0
            ? optionItem.text.trim()
            : `Opsi ${String.fromCharCode(65 + optionIndex)}`,
        is_correct: Boolean(optionItem.is_correct),
      }
    })

    if (options.length < 4) {
      options = [
        ...options,
        ...Array.from({ length: 4 - options.length }, (_, fillerIndex) => ({
          text: `Opsi ${String.fromCharCode(65 + options.length + fillerIndex)}`,
          is_correct: false,
        })),
      ]
    }

    if (!options.some((option) => option.is_correct)) {
      options[0] = { ...options[0], is_correct: true }
    }

    return {
      text:
        typeof item.text === 'string' && item.text.trim().length > 0
          ? item.text.trim()
          : `Pertanyaan ${index + 1}`,
      order: index + 1,
      question_type: 'MCQ',
      points: typeof item.points === 'number' && Number.isFinite(item.points) ? item.points : 10,
      explanation: typeof item.explanation === 'string' ? item.explanation : '',
      options,
    }
  })

  return {
    title:
      typeof payload.title === 'string' && payload.title.trim().length > 0
        ? payload.title.trim()
        : `Kuis ${lessonTitle}`,
    instructions:
      typeof payload.instructions === 'string' && payload.instructions.trim().length > 0
        ? payload.instructions.trim()
        : 'Kerjakan kuis berikut berdasarkan materi yang telah dipelajari.',
    max_attempts:
      typeof payload.max_attempts === 'number' && Number.isFinite(payload.max_attempts)
        ? payload.max_attempts
        : 1,
    passing_score:
      typeof payload.passing_score === 'number' && Number.isFinite(payload.passing_score)
        ? payload.passing_score
        : 70,
    status: 'draft',
    mode: 'graded',
    shuffle_questions: false,
    shuffle_options: false,
    questions,
  }
}

function sanitizeAssignmentPayload(
  rawPayload: unknown,
  lessonTitle: string
): Record<string, unknown> | null {
  if (!rawPayload || typeof rawPayload !== 'object') return null

  const payload = rawPayload as Record<string, unknown>
  const instructions = typeof payload.instructions === 'string' ? payload.instructions.trim() : ''

  if (!instructions) return null

  return {
    title:
      typeof payload.title === 'string' && payload.title.trim().length > 0
        ? payload.title.trim()
        : `Tugas ${lessonTitle}`,
    instructions,
    max_points:
      typeof payload.max_points === 'number' && Number.isFinite(payload.max_points)
        ? payload.max_points
        : 100,
    max_attempts:
      typeof payload.max_attempts === 'number' && Number.isFinite(payload.max_attempts)
        ? payload.max_attempts
        : 1,
  }
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
        assignment_type: 'lesson_draft',
        bloom_level: 'N/A',
        question_count: 0,
        file_name: 'lesson_draft_generation',
        processing_ms: Date.now() - startTime,
        model: MODEL,
        status,
        error_message: errorMessage,
        source_type: 'lesson',
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
      lesson_id,
      course_id,
      content_types = [],
      subject = '',
      grade_level = '',
    } = body as {
      lesson_id: string
      course_id: string
      content_types?: string[]
      subject?: string
      grade_level?: string
    }

    if (!lesson_id) return err('LESSON_ID_REQUIRED', 400)
    if (!course_id) return err('COURSE_ID_REQUIRED', 400)

    // Input size validation
    if (subject && subject.length > MAX_FIELD_CHARS) return err('SUBJECT_TOO_LONG', 400)
    if (grade_level && grade_level.length > MAX_FIELD_CHARS) return err('GRADE_LEVEL_TOO_LONG', 400)

    // ✅ Course ownership validation BEFORE any expensive operations
    // Verify authenticated user has access to this course
    const { count: courseAccessCount, error: courseAccessError } = await serviceClient
      .from('course_collaborators')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course_id)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (courseAccessError) {
      await logAttempt('error', null, 'COURSE_ACCESS_CHECK_FAILED')
      return err('INTERNAL_ERROR', 500)
    }

    if (courseAccessCount === 0) {
      await logAttempt('error', null, 'NO_COURSE_ACCESS')
      return err('FORBIDDEN_NO_COURSE_ACCESS', 403)
    }

    // 3. Rate limiting
    await checkRateLimit(serviceClient, userId, tenantId)

    // 4. Gather lesson context
    const { lessonTitle, context } = await gatherLessonContext(serviceClient, lesson_id, tenantId)
    const mode = resolveDraftMode(content_types)

    // 5. Call Groq LLM
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      await logAttempt('error', null, 'AI_CONFIG_MISSING')
      return err('AI_CONFIG_MISSING', 500)
    }

    const prompt = buildLessonDraftPrompt(lessonTitle, context, subject, grade_level, mode)

    if (prompt.length > MAX_PROMPT_CHARS) {
      await logAttempt('error', null, 'PROMPT_TOO_LONG')
      return err('PROMPT_TOO_LONG', 400)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

    interface DraftBlock {
      type: string
      title: string | null
      content: string
    }
    interface AssessmentSuggestions {
      quiz_title?: string
      assignment_title?: string
      assignment_instructions?: string
    }
    interface DraftResult {
      blocks?: DraftBlock[]
      assessment_suggestions?: AssessmentSuggestions
      quiz_payload?: Record<string, unknown>
      assignment_payload?: Record<string, unknown>
    }

    let draftResult: DraftResult
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
      draftResult = JSON.parse(rawContent) as DraftResult
    } catch (e) {
      clearTimeout(timeout)
      const msg = e instanceof Error ? e.message : String(e)
      const isTimeout = msg.includes('AbortError') || msg.includes('abort')
      await logAttempt('error', null, isTimeout ? 'LLM_TIMEOUT' : 'AI_GENERATION_FAILED')
      return err(isTimeout ? 'AI_TIMEOUT' : 'AI_GENERATION_FAILED', 502)
    }

    const blocks = sanitizeBlocks(draftResult?.blocks)
    const assessmentSuggestions = draftResult?.assessment_suggestions
      ? {
          quiz_title: draftResult.assessment_suggestions.quiz_title || undefined,
          assignment_title: draftResult.assessment_suggestions.assignment_title || undefined,
          assignment_instructions:
            draftResult.assessment_suggestions.assignment_instructions || undefined,
        }
      : undefined
    const quizPayload = sanitizeQuizPayload(draftResult?.quiz_payload, lessonTitle)
    const assignmentPayload = sanitizeAssignmentPayload(
      draftResult?.assignment_payload,
      lessonTitle
    )

    if ((mode === 'lesson_draft' || mode === 'reading') && blocks.length === 0) {
      await logAttempt('error', null, 'AI_INVALID_RESPONSE')
      return err('AI_INVALID_RESPONSE', 502)
    }

    if (mode === 'quiz' && !quizPayload) {
      await logAttempt('error', null, 'AI_INVALID_RESPONSE')
      return err('AI_INVALID_RESPONSE', 502)
    }

    if (mode === 'writing' && !assignmentPayload) {
      await logAttempt('error', null, 'AI_INVALID_RESPONSE')
      return err('AI_INVALID_RESPONSE', 502)
    }
    const artifactKind = mode === 'lesson_draft' ? 'lesson_draft' : 'assessment'
    const output = {
      blocks,
      assessment_suggestions: assessmentSuggestions,
      quiz_payload: quizPayload,
      assignment_payload: assignmentPayload,
      mode,
    }

    // 6. Persist artifact
    const { data: artifact, error: saveError } = await serviceClient
      .from('ai_builder_artifacts')
      .insert({
        tenant_id: tenantId,
        course_id,
        created_by: userId,
        artifact_kind: artifactKind,
        target_type: 'lesson',
        target_id: lesson_id,
        source_type: 'lesson',
        source_ref_id: lesson_id,
        prompt_config: { lesson_id, course_id, subject, grade_level, content_types, mode },
        output,
        status: 'generated',
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('Artifact save error (non-fatal):', saveError.message)
    }

    // 7. Log success
    await logAttempt('success', null)

    return json({
      artifact_id: artifact?.id ?? null,
      draft: output,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)

    if (msg === 'AUTH_MISSING' || msg === 'AUTH_INVALID') return err(msg, 401)
    if (msg === 'UNAUTHORIZED_ROLE') return err(msg, 403)
    if (msg === 'TENANT_MISSING') return err(msg, 403)
    if (msg === 'LESSON_NOT_FOUND') return err(msg, 404)
    if (msg === 'RATE_LIMITED') {
      await logAttempt('rate_limited', null, msg)
      return err(msg, 429)
    }

    console.error('Unhandled error in generate-lesson-draft:', e)
    await logAttempt('error', null, msg)
    return err('INTERNAL_ERROR', 500)
  }
})
