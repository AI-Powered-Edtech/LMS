import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { BlobReader, TextWriter, ZipReader } from 'https://esm.sh/@zip.js/zip.js@2.7.32'

import { handleCors, corsHeaders } from '../_shared/cors.ts'

const LLM_TIMEOUT_MS = 30_000
const RATE_LIMIT_PER_HOUR = 20
const MODEL = 'llama-3.1-70b-versatile'
const MAX_CONTENT_CHARS = 8_000

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
    // Fail open on rate limit check error to prevent total lockout
    console.warn('Rate limit check failed:', error.message)
    return
  }

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    throw new Error('RATE_LIMITED')
  }
}

// ─── File Text Extraction ─────────────────────────────────────────────────────

async function extractText(file: File): Promise<string> {
  const type = file.type

  if (type === 'text/plain' || type === 'text/csv') {
    const buf = await file.arrayBuffer()
    return new TextDecoder('utf-8', { fatal: false }).decode(buf)
  }

  if (type === 'application/pdf') {
    const buf = await file.arrayBuffer()
    return extractPdfText(buf)
  }

  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractDocxText(file)
  }

  throw new Error('UNSUPPORTED_FILE_TYPE')
}

function extractPdfText(buffer: ArrayBuffer): string {
  const text = new TextDecoder('latin1').decode(buffer)
  const parts: string[] = []

  // Extract text from BT...ET blocks (begin text / end text PDF operators)
  const btEtRegex = /BT([\s\S]*?)ET/g
  let block: RegExpExecArray | null

  while ((block = btEtRegex.exec(text)) !== null) {
    const content = block[1]

    // Tj operator: (text)Tj
    const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g
    let m: RegExpExecArray | null
    while ((m = tjRegex.exec(content)) !== null) {
      parts.push(decodePdfString(m[1]))
    }

    // TJ operator: [(text)]TJ
    const tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g
    while ((m = tjArrRegex.exec(content)) !== null) {
      const inner = m[1]
      const strRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g
      let sm: RegExpExecArray | null
      while ((sm = strRe.exec(inner)) !== null) {
        parts.push(decodePdfString(sm[1]))
      }
    }
  }

  const result = parts
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Fallback: if regex extraction yielded nothing, try a broader plain-text extraction
  if (result.length < 20) {
    return text
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, MAX_CONTENT_CHARS)
  }

  return result
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const reader = new ZipReader(new BlobReader(file))
    const entries = await reader.getEntries()
    const docEntry = entries.find((e) => e.filename === 'word/document.xml')
    if (!docEntry?.getData) {
      await reader.close()
      throw new Error('DOCX_INVALID_STRUCTURE')
    }
    const xmlText = await docEntry.getData(new TextWriter())
    await reader.close()

    return xmlText
      .replace(/<w:p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'DOCX_INVALID_STRUCTURE') throw e
    throw new Error('DOCX_PARSE_ERROR')
  }
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

const BLOOM_DESCRIPTIONS: Record<string, string> = {
  C1: 'C1-Mengingat: soal menguji daya ingat fakta, definisi, istilah, dan konsep dasar',
  C2: 'C2-Memahami: soal menguji pemahaman dan kemampuan menjelaskan konsep dengan kata sendiri',
  C3: 'C3-Mengaplikasikan: soal menguji kemampuan menerapkan konsep pada situasi baru',
  C4: 'C4-Menganalisis: soal menguji kemampuan menguraikan, membandingkan, dan membedakan',
  C5: 'C5-Mengevaluasi: soal menguji kemampuan menilai, mengkritisi, dan mempertahankan argumen',
  C6: 'C6-Mencipta: soal menguji kemampuan merancang, menghasilkan ide baru, dan bersintesis',
}

function buildPrompt(
  content: string,
  assignmentType: string,
  questionCount: number,
  bloomLevel: string
): string {
  const bloomDesc = BLOOM_DESCRIPTIONS[bloomLevel] ?? BLOOM_DESCRIPTIONS['C3']
  const actualCount = assignmentType === 'writing' ? Math.min(questionCount, 3) : questionCount

  if (assignmentType === 'quiz') {
    return `Kamu adalah pembuat soal kuis profesional untuk sekolah di Indonesia. Berikan respons HANYA dalam format JSON yang valid.

MATERI PELAJARAN:
${content}

INSTRUKSI:
- Buat tepat ${actualCount} soal pilihan ganda dalam Bahasa Indonesia
- Tingkat kognitif Taksonomi Bloom: ${bloomDesc}
- Setiap soal memiliki tepat 4 pilihan (index 0–3)
- Hanya satu jawaban benar (field "answer" adalah index 0–3)
- Soal relevan dengan materi dan dapat dijawab dari teks di atas
- Penjelasan 1–2 kalimat mengapa jawaban tersebut benar

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"summary":"Rangkuman materi 2–3 kalimat","questions":[{"id":"q_0","text":"Teks pertanyaan?","options":["Opsi A","Opsi B","Opsi C","Opsi D"],"answer":1,"explanation":"Alasan jawaban benar","bloomLevel":"${bloomLevel}"}]}`
  }

  if (assignmentType === 'reading') {
    return `Kamu adalah guru Bahasa Indonesia yang ahli membuat soal pemahaman bacaan. Berikan respons HANYA dalam format JSON yang valid.

TEKS BACAAN:
${content}

INSTRUKSI:
- Buat tepat ${actualCount} pertanyaan pemahaman dalam Bahasa Indonesia
- Tingkat kognitif Taksonomi Bloom: ${bloomDesc}
- Pertanyaan dapat dijawab dari teks di atas
- Sertakan kunci jawaban / poin-poin penting sebagai "answer"

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"summary":"Rangkuman teks bacaan 2–3 kalimat","questions":[{"id":"q_0","text":"Pertanyaan pemahaman?","answer":"Kunci jawaban atau poin-poin penting dari teks","bloomLevel":"${bloomLevel}"}]}`
  }

  // writing
  return `Kamu adalah guru menulis yang membuat tugas esai untuk siswa Indonesia. Berikan respons HANYA dalam format JSON yang valid.

MATERI KONTEKS:
${content}

INSTRUKSI:
- Buat tepat ${actualCount} topik penulisan dalam Bahasa Indonesia
- Tingkat kognitif Taksonomi Bloom: ${bloomDesc}
- Setiap topik menantang siswa sesuai level kognitif
- Sertakan rubrik/kriteria penilaian singkat sebagai "answer"

FORMAT JSON (kembalikan HANYA JSON ini, tanpa teks sebelum atau sesudahnya):
{"summary":"Konteks dan tujuan penulisan berdasarkan materi","questions":[{"id":"q_0","text":"Topik penulisan esai","answer":"Kriteria penilaian: [kriteria 1], [kriteria 2], [kriteria 3]. Panjang minimal: 500 kata.","bloomLevel":"${bloomLevel}"}]}`
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsResp = handleCors(req)
  if (corsResp) return corsResp

  const startTime = Date.now()
  let userId: string | undefined
  let tenantId: string | undefined
  let assignmentType = 'quiz'
  let bloomLevel = 'C3'
  let questionCount = 10
  let fileName = 'unknown'
  let fileSize = 0

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
        assignment_type: assignmentType,
        bloom_level: bloomLevel,
        question_count: questionCount,
        file_name: fileName,
        file_size_bytes: fileSize,
        processing_ms: Date.now() - startTime,
        model: MODEL,
        status,
        error_message: errorMessage,
      })
      .catch((e) => console.error('Log insert failed:', e))
  }

  try {
    // 1. Auth + role check
    const auth = await authenticate(req)
    userId = auth.userId
    tenantId = auth.tenantId

    // 2. Parse FormData
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    assignmentType = (formData.get('assignmentType') as string) || 'quiz'
    const questionCountStr = (formData.get('questionCount') as string) || '10'
    bloomLevel = (formData.get('difficulty') as string) || 'C3'

    if (!file) return err('FILE_REQUIRED', 400)
    if (file.size > 10 * 1024 * 1024) return err('FILE_TOO_LARGE', 400)

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ]
    if (!validTypes.includes(file.type)) return err('UNSUPPORTED_FILE_TYPE', 400)

    fileName = file.name
    fileSize = file.size
    questionCount = Math.min(
      Math.max(parseInt(questionCountStr, 10) || 10, 1),
      assignmentType === 'writing' ? 3 : 50
    )

    // 3. Rate limiting
    await checkRateLimit(serviceClient, userId, tenantId)

    // 4. Extract text from file
    let extractedText: string
    try {
      extractedText = await extractText(file)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await logAttempt('error', null, msg)
      if (msg === 'UNSUPPORTED_FILE_TYPE') return err(msg, 400)
      if (msg === 'DOCX_INVALID_STRUCTURE' || msg === 'DOCX_PARSE_ERROR')
        return err('DOCX_PARSE_ERROR', 422)
      return err('FILE_EXTRACTION_FAILED', 422)
    }

    const contentText = extractedText.trim().slice(0, MAX_CONTENT_CHARS)
    if (contentText.length < 50) {
      await logAttempt('error', null, 'INSUFFICIENT_CONTENT')
      return err('INSUFFICIENT_CONTENT', 422)
    }

    // 5. Call Groq LLM
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      await logAttempt('error', null, 'AI_CONFIG_MISSING')
      return err('AI_CONFIG_MISSING', 500)
    }

    const prompt = buildPrompt(contentText, assignmentType, questionCount, bloomLevel)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

    interface AiQuestion {
      id: string
      text: string
      options?: string[]
      answer?: number | string
      explanation?: string
      bloomLevel?: string
    }
    interface AiResult {
      summary: string
      questions: AiQuestion[]
    }

    let aiResult: AiResult
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
        const body = await response.text().catch(() => '')
        console.error('Groq API error:', response.status, body)
        await logAttempt('error', null, `GROQ_${response.status}`)
        return err('AI_GENERATION_FAILED', 502)
      }

      const data = await response.json()
      const rawContent: string = data?.choices?.[0]?.message?.content ?? ''
      aiResult = JSON.parse(rawContent) as AiResult
    } catch (e) {
      clearTimeout(timeout)
      const msg = e instanceof Error ? e.message : String(e)
      const isTimeout = msg.includes('AbortError') || msg.includes('abort')
      await logAttempt('error', null, isTimeout ? 'LLM_TIMEOUT' : 'AI_GENERATION_FAILED')
      return err(isTimeout ? 'AI_TIMEOUT' : 'AI_GENERATION_FAILED', 502)
    }

    if (!aiResult?.questions || !Array.isArray(aiResult.questions)) {
      await logAttempt('error', null, 'AI_INVALID_RESPONSE')
      return err('AI_INVALID_RESPONSE', 502)
    }

    const questions = aiResult.questions.slice(0, questionCount).map((q, i) => ({
      ...q,
      id: q.id ?? `q_${i}`,
      bloomLevel: q.bloomLevel ?? bloomLevel,
    }))

    // 6. Persist generated content
    const { data: savedContent, error: saveError } = await serviceClient
      .from('ai_generated_content')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        file_name: fileName,
        file_type: file.type,
        assignment_type: assignmentType,
        bloom_level: bloomLevel,
        question_count: questions.length,
        summary: aiResult.summary ?? '',
        questions,
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('Content save error (non-fatal):', saveError.message)
    }

    // 7. Log success
    await logAttempt('success', savedContent?.id ?? null)

    return json({
      id: savedContent?.id ?? null,
      type: assignmentType,
      tenant_id: tenantId,
      summary: aiResult.summary ?? '',
      questions,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)

    if (msg === 'AUTH_MISSING' || msg === 'AUTH_INVALID') return err(msg, 401)
    if (msg === 'UNAUTHORIZED_ROLE') return err(msg, 403)
    if (msg === 'TENANT_MISSING') return err(msg, 403)
    if (msg === 'RATE_LIMITED') {
      await logAttempt('rate_limited', null, msg)
      return err(msg, 429)
    }

    console.error('Unhandled error in generate-ai-content:', e)
    await logAttempt('error', null, msg)
    return err('INTERNAL_ERROR', 500)
  }
})
