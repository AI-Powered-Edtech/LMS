import { supabase } from '@/services/supabase/client'

export const onboardingService = {
  /** Ambil progress onboarding user */
  async getProgress(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('step, completed_at')
      .eq('user_id', userId)
    // Table may not exist on some environments — return empty gracefully.
    if (error) {
      if (import.meta.env.DEV)
        console.warn('[onboardingService] onboarding_progress unavailable:', error.message)
      return []
    }
    return data ?? []
  },

  /** Tandai step onboarding sebagai selesai */
  async completeStep(userId: string, tenantId: string, step: string) {
    const { error } = await supabase.from('onboarding_progress').upsert(
      {
        user_id: userId,
        tenant_id: tenantId,
        step,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,step' }
    )
    if (error) throw error
  },

  /** Ambil semua data onboarding (untuk admin) */
  async getAll(tenantId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('id, user_id, step, completed_at, tenant_id')
      .eq('tenant_id', tenantId)
    // Table may not exist on some environments — return empty gracefully.
    if (error) {
      if (import.meta.env.DEV)
        console.warn('[onboardingService] onboarding_progress unavailable:', error.message)
      return []
    }
    return data ?? []
  },

  /** Upsert onboarding data */
  async upsert(payload: { user_id: string; tenant_id: string; step: string }) {
    const { error } = await supabase.from('onboarding_progress').upsert(payload)
    if (error) throw error
  },
}
