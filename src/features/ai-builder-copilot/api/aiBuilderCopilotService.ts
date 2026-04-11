import { readVilSession } from '@/services/auth/vilSession'
import { supabase } from '@/services/supabase/client'

import type {
  AIBuilderArtifact,
  ApplyLessonDraftResult,
  ApplyOutlineResult,
  GenerateLessonDraftRequest,
  GenerateLessonDraftResponse,
  GenerateOutlineRequest,
  GenerateOutlineResponse,
  TransformContentRequest,
  TransformContentResponse,
} from '../types'

// ─── Error Mapping ───────────────────────────────────────────────────────────

const ERROR_MAP: Record<string, string> = {
  AUTH_MISSING: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  AUTH_INVALID: 'Sesi Anda tidak valid. Silakan masuk kembali.',
  UNAUTHORIZED_ROLE: 'Anda tidak memiliki izin menggunakan fitur ini.',
  TENANT_MISSING: 'Organisasi tidak ditemukan. Hubungi administrator.',
  RATE_LIMITED: 'Batas penggunaan AI tercapai. Coba lagi nanti.',
  AI_CONFIG_MISSING: 'Konfigurasi AI belum tersedia. Hubungi administrator.',
  AI_GENERATION_FAILED: 'AI gagal memproses permintaan. Coba lagi.',
  AI_TIMEOUT: 'Waktu pemrosesan AI habis. Coba lagi.',
  AI_INVALID_RESPONSE: 'Respons AI tidak valid. Coba lagi.',
  COURSE_ID_REQUIRED: 'ID kursus wajib diisi.',
  COURSE_TITLE_REQUIRED: 'Judul kursus wajib diisi (minimal 3 karakter).',
  LESSON_ID_REQUIRED: 'ID pelajaran wajib diisi.',
  LESSON_NOT_FOUND: 'Pelajaran tidak ditemukan.',
  FORBIDDEN_NO_COURSE_ACCESS: 'Anda tidak memiliki akses ke kursus ini.',
  CONTENT_TOO_SHORT: 'Konten terlalu pendek untuk diproses (minimal 10 karakter).',
  CONTENT_TOO_LONG: 'Konten terlalu panjang. Maksimal 5.000 karakter.',
  INVALID_ACTION: 'Aksi transformasi tidak valid.',
  INTERNAL_ERROR: 'Terjadi kesalahan. Coba lagi.',
  PROMPT_TOO_LONG: 'Prompt terlalu panjang. Maksimal 10.000 karakter.',
  COURSE_TITLE_TOO_LONG: 'Judul kursus terlalu panjang. Maksimal 5.000 karakter.',
  COURSE_DESCRIPTION_TOO_LONG: 'Deskripsi kursus terlalu panjang. Maksimal 5.000 karakter.',
  SUBJECT_TOO_LONG: 'Mata pelajaran terlalu panjang. Maksimal 5.000 karakter.',
  GRADE_LEVEL_TOO_LONG: 'Tingkat kelas terlalu panjang. Maksimal 5.000 karakter.',
  LESSON_TITLE_TOO_LONG: 'Judul pelajaran terlalu panjang. Maksimal 5.000 karakter.',
}

function mapError(msg: string): string {
  // Check for exact code match
  const code = msg.split(':').pop()?.trim() ?? msg
  if (ERROR_MAP[code]) return ERROR_MAP[code]

  // Check for partial matches
  if (msg.includes('RATE_LIMITED') || msg.includes('429')) return ERROR_MAP.RATE_LIMITED
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
    return 'Gagal terhubung ke server. Periksa koneksi internet Anda.'

  return msg || ERROR_MAP.INTERNAL_ERROR
}

function handleFunctionError(error: { message?: string } | null, data: unknown): void {
  if (error) throw new Error(mapError(error.message ?? ''))
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(mapError((data as { error: string }).error))
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const aiBuilderCopilotService = {
  // ─── Generate Outline ────────────────────────────────────────────────────────

  async generateOutline(req: GenerateOutlineRequest): Promise<GenerateOutlineResponse> {
    // TODO: Phase 6 — generate-course-outline belum punya VIL endpoint resmi.
    // Menggunakan /api/v1/ai/generate-content sebagai proxy terdekat.
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
    const token = readVilSession()?.access_token

    const res = await fetch(`${apiUrl}/api/v1/ai/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ function: 'generate-course-outline', ...req }),
    })

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      error = { message: (errBody as { error?: string }).error ?? `HTTP ${res.status}` }
    } else {
      data = (await res.json()) as Record<string, unknown>
    }

    handleFunctionError(error, data)

    const d = data as Record<string, unknown>
    const outline = d?.outline as { modules?: unknown[] } | undefined

    if (!outline?.modules || !Array.isArray(outline.modules)) {
      throw new Error('Respons AI tidak valid. Coba lagi.')
    }

    return {
      artifact_id: (d.artifact_id as string | null) ?? null,
      outline: d.outline as GenerateOutlineResponse['outline'],
    }
  },

  // ─── Generate Lesson Draft ───────────────────────────────────────────────────

  async generateLessonDraft(req: GenerateLessonDraftRequest): Promise<GenerateLessonDraftResponse> {
    // TODO: Phase 6 — generate-lesson-draft belum punya VIL endpoint resmi.
    // Menggunakan /api/v1/ai/generate-content sebagai proxy terdekat.
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
    const token = readVilSession()?.access_token

    const res = await fetch(`${apiUrl}/api/v1/ai/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ function: 'generate-lesson-draft', ...req }),
    })

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      error = { message: (errBody as { error?: string }).error ?? `HTTP ${res.status}` }
    } else {
      data = (await res.json()) as Record<string, unknown>
    }

    handleFunctionError(error, data)

    const d = data as Record<string, unknown>
    const draft = d?.draft as Record<string, unknown> | undefined

    const hasBlocks = Array.isArray(draft?.blocks)
    const hasQuizPayload = !!draft?.quiz_payload && typeof draft.quiz_payload === 'object'
    const hasAssignmentPayload =
      !!draft?.assignment_payload && typeof draft.assignment_payload === 'object'

    if (!hasBlocks && !hasQuizPayload && !hasAssignmentPayload) {
      throw new Error('Respons AI tidak valid. Coba lagi.')
    }

    return {
      artifact_id: (d.artifact_id as string | null) ?? null,
      draft: {
        blocks: hasBlocks ? (draft!.blocks as import('../types').LessonDraftBlock[]) : [],
        assessment_suggestions: draft?.assessment_suggestions as
          | import('../types').AssessmentSuggestions
          | undefined,
        quiz_payload: hasQuizPayload
          ? (draft!.quiz_payload as import('../types').QuizDraftPayload)
          : undefined,
        assignment_payload: hasAssignmentPayload
          ? (draft!.assignment_payload as import('../types').AssignmentDraftPayload)
          : undefined,
      },
    }
  },

  // ─── Transform Content ───────────────────────────────────────────────────────

  async transformContent(req: TransformContentRequest): Promise<TransformContentResponse> {
    // TODO: Phase 6 — transform-course-content belum punya VIL endpoint resmi.
    // Menggunakan /api/v1/ai/generate-content sebagai proxy terdekat.
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
    const token = readVilSession()?.access_token

    const res = await fetch(`${apiUrl}/api/v1/ai/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ function: 'transform-course-content', ...req }),
    })

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      error = { message: (errBody as { error?: string }).error ?? `HTTP ${res.status}` }
    } else {
      data = (await res.json()) as Record<string, unknown>
    }

    handleFunctionError(error, data)

    const d = (data ?? {}) as Record<string, unknown>
    return {
      artifact_id: (d.artifact_id as string | null) ?? null,
      result: (d.result as Record<string, unknown> | undefined) ?? d,
    }
  },

  // ─── Apply Outline ───────────────────────────────────────────────────────────

  async applyOutline(
    artifactId: string,
    courseId: string,
    selectedModules: object[]
  ): Promise<ApplyOutlineResult> {
    const { data, error } = await supabase.rpc('apply_ai_outline_artifact', {
      p_artifact_id: artifactId,
      p_course_id: courseId,
      p_selected_modules: selectedModules,
    })

    if (error) throw new Error(mapError(error.message))

    return {
      modules: (data as ApplyOutlineResult)?.modules ?? [],
      lessons: (data as ApplyOutlineResult)?.lessons ?? [],
    }
  },

  // ─── Apply Lesson Draft ──────────────────────────────────────────────────────

  async applyLessonDraft(
    artifactId: string,
    lessonId: string,
    selectedBlocks: object[],
    quizPayload?: object | null,
    assignmentPayload?: object | null
  ): Promise<ApplyLessonDraftResult> {
    const { data, error } = await supabase.rpc('apply_ai_lesson_artifact', {
      p_artifact_id: artifactId,
      p_lesson_id: lessonId,
      p_selected_blocks: selectedBlocks,
      p_quiz_payload: quizPayload ?? null,
      p_assignment_payload: assignmentPayload ?? null,
    })

    if (error) throw new Error(mapError(error.message))

    return {
      blocks: (data as ApplyLessonDraftResult)?.blocks ?? [],
      quiz_id: (data as ApplyLessonDraftResult)?.quiz_id ?? null,
      assignment_id: (data as ApplyLessonDraftResult)?.assignment_id ?? null,
    }
  },

  // ─── History ─────────────────────────────────────────────────────────────────

  async fetchArtifactHistory(
    courseId: string,
    userId: string,
    cursor: string | null = null,
    limit = 20
  ): Promise<{ items: AIBuilderArtifact[]; hasMore: boolean }> {
    let query = supabase
      .from('ai_builder_artifacts')
      .select(
        'id, tenant_id, course_id, created_by, artifact_kind, target_type, target_id, source_type, source_ref_id, prompt_config, output, status, created_at, updated_at'
      )
      .eq('course_id', courseId)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch extra to check if more exist

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const items = data ?? []
    const hasMore = items.length > limit

    return {
      items: items.slice(0, limit),
      hasMore,
    }
  },

  // ─── Dismiss ─────────────────────────────────────────────────────────────────

  async dismissArtifact(artifactId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_builder_artifacts')
      .update({ status: 'dismissed' })
      .eq('id', artifactId)

    if (error) throw new Error(error.message)
  },

  // ─── Reapply (fetch full artifact for re-preview) ──────────────────────────

  async reapplyArtifact(artifactId: string): Promise<AIBuilderArtifact> {
    const { data, error } = await supabase
      .from('ai_builder_artifacts')
      .select(
        'id, tenant_id, course_id, created_by, artifact_kind, target_type, target_id, source_type, source_ref_id, prompt_config, output, status, created_at, updated_at'
      )
      .eq('id', artifactId)
      .single()

    if (error) throw new Error(error.message)
    return data as AIBuilderArtifact
  },
}
