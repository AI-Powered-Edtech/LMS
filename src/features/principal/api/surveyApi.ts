// ==========================================================================
// Survey API — surveyApi.ts
//
// Supabase queries untuk Satisfaction Survey System.
// ==========================================================================

import { supabase } from '@/services/supabase/client'

import type { SatisfactionSurvey } from '../types'

// ── List Surveys ───────────────────────────────────────────────

/**
 * Ambil semua survey untuk tenant saat ini.
 */
export async function getSurveys(): Promise<SatisfactionSurvey[]> {
  const { data, error } = await supabase
    .from('satisfaction_surveys')
    .select(
      'id, title, target_audience, questions, status, created_at, start_date, end_date, tenant_id, created_by'
    )
    .eq('id', surveyId)
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] getSurveyById error:', error)
    throw new Error('Gagal memuat survei. Silakan coba lagi.')
  }

  return data as SatisfactionSurvey
}

// ── Check Already Responded ────────────────────────────────────

/**
 * Cek apakah pengguna saat ini sudah mengisi survei ini.
 */
export async function hasRespondedToSurvey(surveyId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { count, error } = await supabase
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId)
    .eq('respondent_id', user.id)

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] hasRespondedToSurvey error:', error)
    return false
  }

  return (count ?? 0) > 0
}

// ── Submit Response ────────────────────────────────────────────

export async function submitSurveyResponse(
  surveyId: string,
  answers: Record<string, string | number | boolean>
): Promise<void> {
  // Get current user ID — required by RLS policy (respondent_id = auth.uid())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Pengguna tidak terautentikasi')

  const { error } = await supabase
    .from('survey_responses')
    .insert({
      survey_id: surveyId,
      respondent_id: user.id,
      answers,
    })
    .select('id, survey_id, respondent_id, answers, created_at')
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] submitSurveyResponse error:', error)
    throw new Error('Gagal mengirim respons survey. Silakan coba lagi.')
  }
}
