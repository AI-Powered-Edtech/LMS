import { readVilSession } from '@/services/auth/vilSession'
import { logger } from '@/utils/logger'

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
   * Call the VIL AI grading endpoint to evaluate an essay.
   */
  async gradeEssay(request: AIGradeRequest): Promise<AIGradeResponse> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
      const token = readVilSession()?.access_token

      const response = await fetch(`${apiUrl}/api/v1/ai/grade-essay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        if (import.meta.env.DEV) logger.error('[AI Grader] API error:', response.status)

        let errorMessage = 'Gagal melakukan penilaian otomatis dengan AI.'

        if (response.status === 504) {
          errorMessage = 'Waktu permintaan habis (Timeout). Silakan coba lagi.'
        } else if (response.status === 403) {
          errorMessage = 'Anda tidak memiliki akses untuk menggunakan fitur ini.'
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Check if the response contains an error structure
      if (data?.error) {
        throw new Error(data.error)
      }

      return data as AIGradeResponse
    } catch (err: unknown) {
      if (import.meta.env.DEV) logger.error('[AI Grader] Unexpected error:', err)

      // Re-throw the error with a friendly message to be handled by the UI
      if (err instanceof Error && err.message && err.message !== 'Failed to fetch') {
        throw err
      }

      throw new Error('Terjadi kesalahan yang tidak terduga saat menghubungi layanan AI.')
    }
  },
}
