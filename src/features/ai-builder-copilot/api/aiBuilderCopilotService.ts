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
  CONTENT_TOO_SHORT: 'Konten terlalu pendek untuk diproses (minimal 10 karakter).',
  INVALID_ACTION: 'Aksi transformasi tidak valid.',
  INTERNAL_ERROR: 'Terjadi kesalahan. Coba lagi.',
  PROMPT_TOO_LONG: 'Prompt terlalu panjang. Maksimal 10.000 karakter.',
  SUBJECT_TOO_LONG: 'Mata pelajaran terlalu panjang. Maksimal 5.000 karakter.',
  GRADE_LEVEL_TOO_LONG: 'Tingkat kelas terlalu panjang. Maksimal 5.000 karakter.',
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
    const { data, error } = await supabase.functions.invoke('generate-course-outline', {
      body: req,
    })

    handleFunctionError(error, data)

    if (!data?.outline?.modules || !Array.isArray(data.outline.modules)) {
      throw new Error('Respons AI tidak valid. Coba lagi.')
    }

    return {
      artifact_id: data.artifact_id ?? null,
      outline: data.outline,
    }
  },

  // ─── Generate Lesson Draft ───────────────────────────────────────────────────

  async generateLessonDraft(req: GenerateLessonDraftRequest): Promise<GenerateLessonDraftResponse> {
    const { data, error } = await supabase.functions.invoke('generate-lesson-draft', {
      body: req,
    })

    handleFunctionError(error, data)

    const hasBlocks = Array.isArray(data?.draft?.blocks)
    const hasQuizPayload =
      !!data?.draft?.quiz_payload && typeof data.draft.quiz_payload === 'object'
    const hasAssignmentPayload =
      !!data?.draft?.assignment_payload && typeof data.draft.assignment_payload === 'object'

    if (!hasBlocks && !hasQuizPayload && !hasAssignmentPayload) {
      throw new Error('Respons AI tidak valid. Coba lagi.')
    }

    return {
      artifact_id: data.artifact_id ?? null,
      draft: {
        blocks: hasBlocks ? data.draft.blocks : [],
        assessment_suggestions: data.draft.assessment_suggestions ?? undefined,
        quiz_payload: hasQuizPayload ? data.draft.quiz_payload : undefined,
        assignment_payload: hasAssignmentPayload ? data.draft.assignment_payload : undefined,
      },
    }
  },

  // ─── Transform Content ───────────────────────────────────────────────────────

  async transformContent(req: TransformContentRequest): Promise<TransformContentResponse> {
    const { data, error } = await supabase.functions.invoke('transform-course-content', {
      body: req,
    })

    handleFunctionError(error, data)

    return {
      artifact_id: data.artifact_id ?? null,
      result: data.result ?? data,
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
