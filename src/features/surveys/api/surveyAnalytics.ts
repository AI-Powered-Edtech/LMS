// EduSync LMS — Survey Analytics Service
// Uses the get_survey_results RPC for aggregated analytics

import { db } from '@/services/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SurveyQuestionAnalytics {
  questionId: string
  questionText: string
  questionType: 'rating' | 'yesno' | 'text'
  // Rating metrics
  ratingAvg?: number
  ratingDistribution?: Record<number, number>
  // Yes/No metrics
  yesCount?: number
  noCount?: number
  // Text metrics
  textAnswers?: string[]
}

export interface SurveyAnalyticsResult {
  surveyId: string
  surveyTitle: string
  targetAudience: string
  status: string
  totalResponses: number
  responseRate: number | null
  questions: SurveyQuestionAnalytics[]
  createdAt: string
}

export interface SurveySummary {
  surveyId: string
  title: string
  targetAudience: string
  status: string
  totalResponses: number
  uniqueRespondents: number
  firstResponseAt: string | null
  lastResponseAt: string | null
  avgResponseTimeSeconds: number | null
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const surveyAnalyticsService = {
  /**
   * Get aggregated survey results using the get_survey_results RPC.
   * Returns per-question analytics with rating averages, yes/no counts, and text answers.
   */
  async getSurveyResults(tenantId: string, surveyId: string): Promise<SurveyAnalyticsResult> {
    const { data, error } = await db.rpc('get_survey_results', {
      p_tenant_id: tenantId,
      p_survey_id: surveyId,
    })

    if (error) {
      if (import.meta.env.DEV) console.error('[SurveyAnalytics] getSurveyResults error:', error)
      throw new Error('Gagal memuat hasil survei.')
    }

    if (!data || data.length === 0) {
      return {
        surveyId,
        surveyTitle: '',
        targetAudience: '',
        status: '',
        totalResponses: 0,
        responseRate: null,
        questions: [],
        createdAt: '',
      }
    }

    // Group by question
    const questions: SurveyQuestionAnalytics[] = data.map((row: any) => ({
      questionId: row.question_id,
      questionText: row.question_text,
      questionType: row.question_type,
      ratingAvg: row.rating_avg ? parseFloat(row.rating_avg) : undefined,
      ratingDistribution: row.rating_distribution ?? undefined,
      yesCount: row.yes_count ? parseInt(row.yes_count) : undefined,
      noCount: row.no_count ? parseInt(row.no_count) : undefined,
      textAnswers: row.text_answers ?? undefined,
    }))

    return {
      surveyId: data[0].survey_id,
      surveyTitle: data[0].survey_title,
      targetAudience: data[0].target_audience,
      status: data[0].status,
      totalResponses: parseInt(data[0].total_responses) || 0,
      responseRate: data[0].response_rate ? parseFloat(data[0].response_rate) : null,
      questions,
      createdAt: data[0].created_at,
    }
  },

  /**
   * Get survey analytics summary from the materialized view.
   * Returns high-level metrics for all surveys.
   */
  async getSurveySummary(tenantId: string): Promise<SurveySummary[]> {
    const { data, error } = await db.rpc('get_survey_summary', {
      p_tenant_id: tenantId,
    })

    if (error) {
      if (import.meta.env.DEV) console.error('[SurveyAnalytics] getSurveySummary error:', error)
      return []
    }

    return (data ?? []).map((row: any) => ({
      surveyId: row.survey_id,
      title: row.title,
      targetAudience: row.target_audience,
      status: row.status,
      totalResponses: parseInt(row.total_responses) || 0,
      uniqueRespondents: parseInt(row.unique_respondents) || 0,
      firstResponseAt: row.first_response_at,
      lastResponseAt: row.last_response_at,
      avgResponseTimeSeconds: row.avg_response_time_seconds
        ? parseFloat(row.avg_response_time_seconds)
        : null,
    }))
  },

  /**
   * Export survey responses in a flat format suitable for CSV generation.
   */
  async exportResponses(
    tenantId: string,
    surveyId: string
  ): Promise<
    Array<{
      respondentId: string
      respondedAt: string
      questionId: string
      questionText: string
      questionType: string
      answerValue: string
    }>
  > {
    const { data, error } = await db.rpc('export_survey_responses', {
      p_tenant_id: tenantId,
      p_survey_id: surveyId,
    })

    if (error) {
      if (import.meta.env.DEV) console.error('[SurveyAnalytics] exportResponses error:', error)
      throw new Error('Gagal mengekspor respons survei.')
    }

    return (data ?? []).map((row: any) => ({
      respondentId: row.respondent_id,
      respondedAt: row.responded_at,
      questionId: row.question_id,
      questionText: row.question_text,
      questionType: row.question_type,
      answerValue: row.answer_value ?? '',
    }))
  },
}
