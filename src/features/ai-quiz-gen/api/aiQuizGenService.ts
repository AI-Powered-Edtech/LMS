import { supabase } from '@/services/supabase/client'
import type { GenerateQuizConfig, GenerateQuizResult } from '../types'

export const aiQuizGenService = {
  async generateQuestions(config: GenerateQuizConfig): Promise<GenerateQuizResult> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Tidak terautentikasi')

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz-from-content`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lesson_id: config.lessonId,
          question_count: config.questionCount,
          question_types: config.questionTypes,
          difficulty: config.difficulty,
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const errorMsg = (err as { error?: string }).error || ''
      const friendlyErrors: Record<string, string> = {
        LESSON_NOT_FOUND: 'Materi tidak ditemukan.',
        INSUFFICIENT_CONTENT:
          'Konten materi terlalu singkat untuk dibuat soal. Tambahkan lebih banyak materi.',
        AI_GENERATION_FAILED: 'Gagal berkomunikasi dengan AI. Coba lagi.',
        AI_CONFIG_MISSING: 'Konfigurasi AI belum tersedia.',
        UNAUTHORIZED_ROLE: 'Anda tidak memiliki izin untuk fitur ini.',
        INVALID_QUESTION_COUNT: 'Jumlah soal harus antara 1-20.',
      }
      throw new Error(friendlyErrors[errorMsg] || 'Gagal membuat soal. Coba lagi.')
    }

    return response.json() as Promise<GenerateQuizResult>
  },
}
