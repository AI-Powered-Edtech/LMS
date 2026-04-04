import { supabase } from '@/services/supabase/client'

import type { AIGeneratedContent, GenerateAIContentResponse } from '../types'

/**
 * Creator Service
 * Wraps the generate-ai-content Edge Function and ai_generated_content DB table.
 */
export const creatorService = {
  /**
   * Generate AI content (quiz/reading/writing) from an uploaded file.
   * Calls the generate-ai-content Supabase Edge Function.
   */
  async generateAIContent(formData: FormData): Promise<GenerateAIContentResponse> {
    const { data, error } = await supabase.functions.invoke('generate-ai-content', {
      body: formData,
    })

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

    return data as GenerateAIContentResponse
  },

  /**
   * Fetch AI generation history for a user.
   */
  async fetchHistory(userId: string): Promise<AIGeneratedContent[]> {
    const { data, error } = await supabase
      .from('ai_generated_content')
      .select(
        'id, file_name, file_type, assignment_type, bloom_level, question_count, summary, questions, used_at, created_at, updated_at, tenant_id, created_by'
      )
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)
    return (data ?? []) as AIGeneratedContent[]
  },

  /**
   * Mark content as used (set used_at timestamp).
   */
  async markAsUsed(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_generated_content')
      .update({ used_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  /**
   * Update questions in a saved generation (after user edits).
   */
  async updateQuestions(id: string, questions: unknown[]): Promise<void> {
    const { error } = await supabase.from('ai_generated_content').update({ questions }).eq('id', id)

    if (error) throw new Error(error.message)
  },

  /**
   * Delete a saved generation.
   */
  async deleteGeneration(id: string): Promise<void> {
    const { error } = await supabase.from('ai_generated_content').delete().eq('id', id)

    if (error) throw new Error(error.message)
  },
}
