import { apiFetch } from '@/src/lib/api'

export const onboardingService = {
  /** Ambil progress onboarding user */
  async getProgress(_userId: string) {
    const { data, error } = await apiFetch('/onboarding_progress')
    if (error) throw error
    return data ?? []
  },

  /** Tandai step onboarding sebagai selesai */
  async completeStep(_userId: string, _step: string) {
    const { error } = await apiFetch('/onboarding_progress')
    if (error) throw error
  },

  /** Ambil semua data onboarding (untuk admin) */
  async getAll(_tenantId: string) {
    const { data, error } = await apiFetch('/onboarding_progress')
    if (error) throw error
    return data ?? []
  },

  /** Upsert onboarding data */
  async upsert(_payload: { user_id: string; step: string }) {
    const { error } = await apiFetch('/onboarding_progress')
    if (error) throw error
  },
}
