import { supabase } from '@/src/services/supabase/client'

export interface GeneratedContent {
  type?: string
  summary?: string
  questions: Array<{
    id: string
    question: string
    text?: string
    options?: Array<string | { id: string; text: string }>
    correctAnswer?: string
    answer?: string
    explanation?: string
    bloomLevel?: string
  }>
  error?: string
}

/**
 * Creator Service
 * Wraps the generate-ai-content Edge Function invocation.
 */
export const creatorService = {
  /**
   * Generate AI content (quiz/reading/writing) from an uploaded file.
   * Invokes the generate-ai-content Supabase Edge Function.
   */
  async generateAIContent(formData: FormData): Promise<GeneratedContent> {
    const { data, error } = await supabase.functions.invoke('generate-ai-content', {
      body: formData,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('404') || msg.includes('not found') || msg.includes('FetchError')) {
        throw new Error('Layanan AI (Backend API) belum tersedia saat ini.')
      }
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        throw new Error(
          'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.'
        )
      }
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('timeout')
      ) {
        throw new Error('Gagal terhubung ke server. Periksa koneksi internet Anda dan coba lagi.')
      }
      throw new Error(msg || 'Gagal memproses materi dengan AI.')
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    if (!data?.questions || !Array.isArray(data.questions)) {
      throw new Error('Respons API tidak valid.')
    }

    return data as GeneratedContent
  },
}
