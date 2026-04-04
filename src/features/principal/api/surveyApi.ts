// ==========================================================================
// Survey API — surveyApi.ts
//
// Supabase queries untuk Satisfaction Survey System.
// ==========================================================================

import { supabase } from '@/services/supabase/client'

import type {
  CreateSurveyInput,
  QuestionResult,
  SatisfactionSurvey,
  SurveyResultsData,
} from '../types'

// ── List Surveys ───────────────────────────────────────────────

/**
 * Ambil semua survey untuk tenant saat ini.
 */
export async function getSurveys(): Promise<SatisfactionSurvey[]> {
  const { data, error } = await supabase
    .from('satisfaction_surveys')
    .select(
      'id, title, target_audience, questions, status, start_date, end_date, created_at, created_by, tenant_id'
    )
    .order('created_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] getSurveys error:', error)
    throw new Error('Gagal memuat daftar survey. Silakan coba lagi.')
  }

  return (data ?? []) as SatisfactionSurvey[]
}

// ── Create Survey ──────────────────────────────────────────────

export async function createSurvey(input: CreateSurveyInput): Promise<SatisfactionSurvey> {
  const { data, error } = await supabase
    .from('satisfaction_surveys')
    .insert({
      title: input.title,
      target_audience: input.target_audience,
      questions: input.questions,
      start_date: input.start_date,
      end_date: input.end_date,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] createSurvey error:', error)
    throw new Error('Gagal membuat survey. Silakan coba lagi.')
  }

  return data as SatisfactionSurvey
}

// ── Update Survey ──────────────────────────────────────────────

export async function updateSurvey(
  id: string,
  input: Partial<CreateSurveyInput>
): Promise<SatisfactionSurvey> {
  const { data, error } = await supabase
    .from('satisfaction_surveys')
    .update({
      ...input,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] updateSurvey error:', error)
    throw new Error('Gagal memperbarui survey. Silakan coba lagi.')
  }

  return data as SatisfactionSurvey
}

// ── Publish Survey ─────────────────────────────────────────────

export async function publishSurvey(id: string): Promise<void> {
  const { error } = await supabase
    .from('satisfaction_surveys')
    .update({ status: 'active' })
    .eq('id', id)

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] publishSurvey error:', error)
    throw new Error('Gagal mempublikasikan survey. Silakan coba lagi.')
  }
}

// ── Close Survey ───────────────────────────────────────────────

export async function closeSurvey(id: string): Promise<void> {
  const { error } = await supabase
    .from('satisfaction_surveys')
    .update({ status: 'closed' })
    .eq('id', id)

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] closeSurvey error:', error)
    throw new Error('Gagal menutup survey. Silakan coba lagi.')
  }
}

// ── Delete Survey ──────────────────────────────────────────────

export async function deleteSurvey(id: string): Promise<void> {
  const { error } = await supabase.from('satisfaction_surveys').delete().eq('id', id)

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] deleteSurvey error:', error)
    throw new Error('Gagal menghapus survey. Silakan coba lagi.')
  }
}

// ── Get Survey Results ─────────────────────────────────────────

export async function getSurveyResults(surveyId: string): Promise<SurveyResultsData> {
  // Fetch survey detail
  const { data: survey, error: surveyError } = await supabase
    .from('satisfaction_surveys')
    .select(
      'id, title, target_audience, questions, status, start_date, end_date, created_at, created_by, tenant_id'
    )
    .eq('id', surveyId)
    .single()

  if (surveyError || !survey) {
    throw new Error('Gagal memuat detail survey.')
  }

  // Fetch responses
  const { data: responses, error: responsesError } = await supabase
    .from('survey_responses')
    .select('id, survey_id, respondent_id, answers, created_at')
    .eq('survey_id', surveyId)
    .limit(500)

  if (responsesError) {
    throw new Error('Gagal memuat respons survey.')
  }

  const allResponses = responses ?? []
  const surveyData = survey as SatisfactionSurvey

  // Aggregate per question
  const questionResults: QuestionResult[] = surveyData.questions.map((question) => {
    const answers = allResponses
      .map((r) => r.answers[question.id])
      .filter((a) => a !== undefined && a !== null && a !== '')

    if (question.type === 'rating') {
      const numAnswers = answers.map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 5)
      const avg =
        numAnswers.length > 0 ? numAnswers.reduce((a, b) => a + b, 0) / numAnswers.length : 0
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      numAnswers.forEach((v) => {
        distribution[v] = (distribution[v] ?? 0) + 1
      })

      return { question, ratingAvg: avg, ratingDistribution: distribution }
    }

    if (question.type === 'yesno') {
      const yesCount = answers.filter((a) => a === true || a === 'true' || a === 'ya').length
      const noCount = answers.filter((a) => a === false || a === 'false' || a === 'tidak').length
      return { question, yesCount, noCount }
    }

    // text
    return { question, textAnswers: answers.map(String) }
  })

  return {
    survey: surveyData,
    totalResponses: allResponses.length,
    questionResults,
  }
}

// ── Get Active Surveys (for respondents) ──────────────────────

/**
 * Ambil semua survey aktif yang dapat diisi oleh responden.
 * RLS akan memfilter berdasarkan tenant secara otomatis.
 */
export async function getActiveSurveys(): Promise<SatisfactionSurvey[]> {
  const { data, error } = await supabase
    .from('satisfaction_surveys')
    .select(
      'id, title, target_audience, questions, status, created_at, start_date, end_date, tenant_id, created_by'
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] getActiveSurveys error:', error)
    throw new Error('Gagal memuat daftar survei aktif. Silakan coba lagi.')
  }

  return (data ?? []) as SatisfactionSurvey[]
}

// ── Get Single Survey By ID ────────────────────────────────────

/**
 * Ambil detail satu survei berdasarkan ID.
 * Digunakan oleh SurveyResponseForm.
 */
export async function getSurveyById(surveyId: string): Promise<SatisfactionSurvey> {
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
 * Mengembalikan false jika tidak terautentikasi atau terjadi error.
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
