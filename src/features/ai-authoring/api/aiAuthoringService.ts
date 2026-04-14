import { readVilSession } from '@/services/auth/vilSession'
import { db } from '@/services/db'

import type {
  AIAuthoringQuestion,
  AIGeneratedContent,
  GenerateFromFileResponse,
  GenerateFromLessonConfig,
  GenerateFromLessonResponse,
} from '../types'

/**
 * AI Authoring Service
 *
 * Unified service replacing creatorService (file-based) and aiQuizGenService
 * (lesson-based) into a single module scoped to the ai-authoring feature.
 */
export const aiAuthoringService = {
  // ─── File-based Generation ──────────────────────────────────────────────────

  /**
   * Generate AI content (quiz / reading / writing) from an uploaded file.
   * Calls the generate-ai-content Supabase Edge Function.
   */
  async generateFromFile(formData: FormData): Promise<GenerateFromFileResponse> {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
    const token = readVilSession()?.access_token

    const res = await fetch(`${apiUrl}/api/v1/ai/generate-content`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Do NOT set Content-Type — browser sets it automatically for FormData (multipart/form-data)
      },
      body: formData,
    })

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      error = { message: (errBody as { error?: string }).error ?? `HTTP ${res.status}` }
    } else {
      data = (await res.json()) as Record<string, unknown>
    }

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('404') || msg.includes('FetchError') || msg.includes('not found')) {
        throw new Error('Layanan AI belum tersedia saat ini.')
      }
      if (
        msg.includes('429') ||
        msg.toLowerCase().includes('rate limit') ||
        msg.includes('RATE_LIMITED')
      ) {
        throw new Error('Batas penggunaan AI tercapai (20 per jam). Coba lagi nanti.')
      }
      if (msg.includes('UNAUTHORIZED_ROLE')) {
        throw new Error('Anda tidak memiliki izin menggunakan fitur ini.')
      }
      if (msg.includes('INSUFFICIENT_CONTENT')) {
        throw new Error(
          'Konten dokumen terlalu sedikit untuk dibuat soal. Gunakan dokumen yang lebih lengkap.'
        )
      }
      if (msg.includes('DOCX_PARSE_ERROR') || msg.includes('FILE_EXTRACTION_FAILED')) {
        throw new Error('Gagal membaca isi dokumen. Pastikan file tidak rusak dan coba lagi.')
      }
      if (msg.includes('AI_TIMEOUT')) {
        throw new Error('Waktu pemrosesan AI habis. Coba lagi dengan dokumen yang lebih pendek.')
      }
      if (msg.includes('AI_GENERATION_FAILED') || msg.includes('AI_INVALID_RESPONSE')) {
        throw new Error('AI gagal membuat soal. Coba lagi.')
      }
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('timeout')
      ) {
        throw new Error('Gagal terhubung ke server. Periksa koneksi internet Anda.')
      }
      throw new Error(msg || 'Gagal memproses materi dengan AI.')
    }

    if (data?.error) {
      const errCode = data.error as string
      const errMap: Record<string, string> = {
        FILE_REQUIRED: 'File wajib diunggah.',
        FILE_TOO_LARGE: 'Ukuran file maksimal 10MB.',
        UNSUPPORTED_FILE_TYPE: 'Format file tidak didukung.',
        INSUFFICIENT_CONTENT: 'Konten dokumen terlalu sedikit untuk dibuat soal.',
        RATE_LIMITED: 'Batas penggunaan AI tercapai (20 per jam). Coba lagi nanti.',
        AI_CONFIG_MISSING: 'Konfigurasi AI belum tersedia. Hubungi administrator.',
        AI_GENERATION_FAILED: 'AI gagal membuat soal. Coba lagi.',
        AI_TIMEOUT: 'Waktu pemrosesan AI habis. Coba dengan dokumen yang lebih pendek.',
        DOCX_PARSE_ERROR: 'Gagal membaca file DOCX. Pastikan file tidak rusak.',
      }
      throw new Error(errMap[errCode] ?? errCode)
    }

    if (!data?.questions || !Array.isArray(data.questions)) {
      throw new Error('Respons AI tidak valid. Coba lagi.')
    }

    // Normalise legacy response: map `id` → `generation_id` if present
    const generation_id: string | null =
      (data!.generation_id as string | null) ?? (data!.id as string | null) ?? null

    return {
      generation_id,
      type: data.type,
      tenant_id: data.tenant_id,
      summary: data.summary,
      questions: data.questions,
    } as GenerateFromFileResponse
  },

  // ─── Lesson-based Generation ─────────────────────────────────────────────────

  /**
   * Generate quiz questions from an existing lesson's content.
   * Calls the generate-quiz-from-content Supabase Edge Function.
   */
  async generateFromLesson(config: GenerateFromLessonConfig): Promise<GenerateFromLessonResponse> {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
    const token = readVilSession()?.access_token

    const res = await fetch(`${apiUrl}/api/v1/ai/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        lesson_id: config.lessonId,
        question_count: config.questionCount,
        question_types: config.questionTypes,
        difficulty: config.difficulty,
        subject: config.subject,
        grade_level: config.gradeLevel,
        curriculum_ref: config.curriculumRef,
      }),
    })

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      error = { message: (errBody as { error?: string }).error ?? `HTTP ${res.status}` }
    } else {
      data = (await res.json()) as Record<string, unknown>
    }

    if (error) {
      const msg = error.message ?? ''
      const errCode = msg.split(':')[0]?.trim() ?? ''

      const friendlyErrors: Record<string, string> = {
        LESSON_NOT_FOUND: 'Materi tidak ditemukan.',
        LESSON_ID_REQUIRED: 'ID materi wajib diisi.',
        INSUFFICIENT_CONTENT:
          'Konten materi terlalu singkat untuk dibuat soal. Tambahkan lebih banyak materi.',
        AI_GENERATION_FAILED: 'Gagal berkomunikasi dengan AI. Coba lagi.',
        AI_CONFIG_MISSING: 'Konfigurasi AI belum tersedia. Hubungi administrator.',
        UNAUTHORIZED_ROLE: 'Anda tidak memiliki izin untuk fitur ini.',
        INVALID_QUESTION_COUNT: 'Jumlah soal harus antara 1–20.',
        RATE_LIMITED: 'Batas penggunaan AI tercapai. Coba lagi nanti.',
      }

      const friendly = friendlyErrors[errCode]
      if (friendly) throw new Error(friendly)

      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('timeout')
      ) {
        throw new Error('Gagal terhubung ke server. Periksa koneksi internet Anda.')
      }

      throw new Error(msg || 'Gagal membuat soal. Coba lagi.')
    }

    if (data?.error) {
      const errCode = data.error as string
      const friendlyErrors: Record<string, string> = {
        LESSON_NOT_FOUND: 'Materi tidak ditemukan.',
        LESSON_ID_REQUIRED: 'ID materi wajib diisi.',
        INSUFFICIENT_CONTENT:
          'Konten materi terlalu singkat untuk dibuat soal. Tambahkan lebih banyak materi.',
        AI_GENERATION_FAILED: 'Gagal berkomunikasi dengan AI. Coba lagi.',
        AI_CONFIG_MISSING: 'Konfigurasi AI belum tersedia. Hubungi administrator.',
        UNAUTHORIZED_ROLE: 'Anda tidak memiliki izin untuk fitur ini.',
        INVALID_QUESTION_COUNT: 'Jumlah soal harus antara 1–20.',
        RATE_LIMITED: 'Batas penggunaan AI tercapai. Coba lagi nanti.',
      }
      throw new Error(friendlyErrors[errCode] ?? 'Gagal membuat soal. Coba lagi.')
    }

    const generation_id: string | null = (data!.generation_id as string | null) ?? null

    return {
      generation_id,
      questions: data!.questions,
      lesson_title: data!.lesson_title,
    } as GenerateFromLessonResponse
  },

  // ─── History / Persistence ───────────────────────────────────────────────────

  /**
   * Fetch AI generation history for the current user.
   * Returns the 20 most recent entries, newest first.
   */
  async fetchHistory(userId: string): Promise<AIGeneratedContent[]> {
    const { data, error } = await db
      .from('ai_generated_content')
      .select(
        'id, file_name, file_type, assignment_type, bloom_level, question_count, summary, questions, used_at, created_at, updated_at, tenant_id, created_by, source_type, lesson_id, subject, grade_level, curriculum_ref'
      )
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)
    return (data ?? []) as AIGeneratedContent[]
  },

  /**
   * Mark a generation as used (stamps used_at with the current timestamp).
   */
  async markAsUsed(id: string): Promise<void> {
    const { error } = await db
      .from('ai_generated_content')
      .update({ used_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  /**
   * Persist edited questions back to the saved generation row.
   */
  async updateQuestions(id: string, questions: AIAuthoringQuestion[]): Promise<void> {
    const { error } = await db.from('ai_generated_content').update({ questions }).eq('id', id)

    if (error) throw new Error(error.message)
  },

  /**
   * Permanently delete a saved generation from history.
   */
  async deleteGeneration(id: string): Promise<void> {
    const { error } = await db.from('ai_generated_content').delete().eq('id', id)

    if (error) throw new Error(error.message)
  },
}
