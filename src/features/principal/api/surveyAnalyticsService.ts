/**
 * Survey Analytics Service
 * 
 * Provides methods for fetching survey analytics, response aggregation,
 * and distribution tracking.
 */

import { supabase } from '@/services/supabase/client'

import type { SurveyAnalyticsData, SurveyResponseRate, QuestionAggregation } from '../types'

/**
 * Service for survey analytics API calls
 */
export const surveyAnalyticsService = {
  /**
   * Get comprehensive survey analytics from materialized view
   */
  async getSurveyAnalytics(surveyId: string): Promise<SurveyAnalyticsData | null> {
    const { data, error } = await supabase
      .from('mv_survey_analytics')
      .select('*')
      .eq('survey_id', surveyId)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return null
      throw error
    }

    return data as SurveyAnalyticsData | null
  },

  /**
   * Get per-question aggregation using RPC
   */
  async getQuestionAggregation(surveyId: string): Promise<QuestionAggregation[]> {
    const { data, error } = await supabase.rpc('get_survey_aggregation', {
      p_survey_id: surveyId,
    })

    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw error
    }

    return (data ?? []) as QuestionAggregation[]
  },

  /**
   * Get response rate and trend analysis
   */
  async getResponseRate(surveyId: string): Promise<SurveyResponseRate | null> {
    const { data, error } = await supabase.rpc('get_survey_response_rate', {
      p_survey_id: surveyId,
    })

    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return null
      throw error
    }

    const row = Array.isArray(data) ? data[0] : data
    return row as SurveyResponseRate | null
  },

  /**
   * Get survey distribution info
   */
  async getSurveyDistribution(surveyId: string) {
    const { data, error } = await supabase
      .from('survey_distributions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return null
      throw error
    }

    return data
  },

  /**
   * Create survey distribution record
   */
  async createDistribution(input: {
    survey_id: string
    tenant_id: string
    target_audience: string
    total_recipients: number
    distribution_method?: 'in_app' | 'email' | 'whatsapp' | 'mixed'
  }) {
    const { data, error } = await supabase
      .from('survey_distributions')
      .insert({
        survey_id: input.survey_id,
        tenant_id: input.tenant_id,
        target_audience: input.target_audience,
        total_recipients: input.total_recipients,
        distribution_method: input.distribution_method ?? 'in_app',
        distributed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update distribution counts (opened, responded)
   */
  async updateDistributionCounts(
    distributionId: string,
    updates: {
      opened_count?: number
      responded_count?: number
    }
  ) {
    const { error } = await supabase
      .from('survey_distributions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', distributionId)

    if (error) throw error
  },
}
