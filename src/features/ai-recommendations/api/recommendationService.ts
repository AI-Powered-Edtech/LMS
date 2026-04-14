import { readVilSession } from '@/services/auth/vilSession'

import type { RecommendationResult } from '../types'

export const aiRecommendationService = {
  /**
   * TODO: Phase 6 — recommend-learning-path belum punya VIL endpoint resmi.
   * Saat VIL mengimplementasi endpoint ini, ganti dengan /api/v1/ai/recommend-learning-path.
   * Sementara menggunakan /api/v1/ai/generate-content sebagai proxy terdekat.
   */
  async getRecommendations(courseId: string): Promise<RecommendationResult> {
    const token = readVilSession()?.access_token
    if (!token) throw new Error('Tidak terautentikasi')

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

    // TODO: Phase 6 — ganti dengan /api/v1/ai/recommend-learning-path saat endpoint tersedia.
    const response = await fetch(`${apiUrl}/api/v1/ai/generate-content`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ function: 'recommend-learning-path', course_id: courseId }),
    })

    if (!response.ok) {
      const err = new Error(`Gagal memuat rekomendasi (${response.status})`) as Error & {
        status: number
      }
      err.status = response.status
      throw err
    }

    return response.json() as Promise<RecommendationResult>
  },
}
