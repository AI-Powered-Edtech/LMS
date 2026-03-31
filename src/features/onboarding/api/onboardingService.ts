import { supabase } from '@/services/supabase/client'

export const onboardingService = {
  /** Ambil progress onboarding user */
  async getProgress(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('step, completed_at')
      .eq('user_id', userId)
    if (error) throw error
    return data ?? []
  },

  /** Tandai step onboarding sebagai selesai */
  async completeStep(userId: string, step: string) {
    const { error } = await supabase.from('onboarding_progress').upsert({
      user_id: userId,
      step,
      completed_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  /** Ambil semua data onboarding (untuk admin) */
  async getAll(tenantId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('id, user_id, step, completed_at, tenant_id')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  },

  /** Upsert onboarding data */
  async upsert(payload: { user_id: string; step: string }) {
    const { error } = await supabase.from('onboarding_progress').upsert(payload)
    if (error) throw error
  },
}
