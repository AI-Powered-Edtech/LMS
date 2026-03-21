import { supabase } from '@/src/lib/supabase'

interface AIGradeRequest {
  submissionId: string
  essayText: string
  rubric: Array<{
    criterion: string
    maxPoints: number
    description?: string
  }>
}

interface AIGradeResponse {
  scores: Record<string, number>
  feedback: Record<string, string>
  overallFeedback: string
}

export const aiGraderService = {
  /**
   * Call the AI grading Edge Function to evaluate an essay.
   */
  async gradeEssay(request: AIGradeRequest): Promise<AIGradeResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-grade-essay', {
        body: request,
      })

      if (error) {
        console.error('[AI Grader] Edge Function error:', error)

        // Extract specific error if available
        let errorMessage = 'Gagal melakukan penilaian otomatis dengan AI.'

        if (error.context && error.context.status === 504) {
          errorMessage = 'Waktu permintaan habis (Timeout). Silakan coba lagi.'
        } else if (error.context && error.context.status === 403) {
          errorMessage = 'Anda tidak memiliki akses untuk menggunakan fitur ini.'
        } else if (error.message) {
          errorMessage = error.message
        }

        throw new Error(errorMessage)
      }

      // Check if the response contains an error structure
      if (data?.error) {
        throw new Error(data.error)
      }

      return data as AIGradeResponse
    } catch (err: any) {
      console.error('[AI Grader] Unexpected error:', err)

      // Re-throw the error with a friendly message to be handled by the UI
      if (err.message && err.message !== 'Failed to fetch') {
        throw err
      }

      throw new Error('Terjadi kesalahan yang tidak terduga saat menghubungi layanan AI.')
    }
  },
}
