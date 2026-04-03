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
    .select('*')
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
    .select('*')
    .eq('id', surveyId)
    .single()

  if (surveyError || !survey) {
    throw new Error('Gagal memuat detail survey.')
  }

  // Fetch responses
  const { data: responses, error: responsesError } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('survey_id', surveyId)

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

// ── Submit Response ────────────────────────────────────────────

export async function submitSurveyResponse(
  surveyId: string,
  answers: Record<string, string | number | boolean>
): Promise<void> {
  const { error } = await supabase.from('survey_responses').insert({
    survey_id: surveyId,
    answers,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Survey] submitSurveyResponse error:', error)
    throw new Error('Gagal mengirim respons survey. Silakan coba lagi.')
  }
}
