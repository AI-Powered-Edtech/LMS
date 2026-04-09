import { supabase } from '@/services/supabase/client'

import type { RecommendationResult } from '../types'

export const aiRecommendationService = {
  async getRecommendations(courseId: string): Promise<RecommendationResult> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Tidak terautentikasi')

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    if (!supabaseUrl) throw new Error('Supabase URL tidak dikonfigurasi')

    const response = await fetch(`${supabaseUrl}/functions/v1/recommend-learning-path`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ course_id: courseId }),
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
