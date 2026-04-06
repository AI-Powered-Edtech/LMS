/**
 * AI Tutor Usage Tracking Service
 * 
 * Provides methods for AI usage logging, quota checking, and cost tracking.
 */

import { supabase } from '@/services/supabase/client'

/**
 * Service for AI tutor usage tracking API calls
 */
export const aiUsageService = {
  /**
   * Check AI rate limit before making a request
   */
  async checkRateLimit(userId: string, tenantId: string) {
    const { data, error } = await supabase.rpc('check_ai_rate_limit', {
      p_user_id: userId,
      p_tenant_id: tenantId,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    return row as {
      allowed: boolean
      daily_remaining: number
      monthly_remaining: number
      daily_limit: number
      monthly_limit: number
      message: string
    }
  },

  /**
   * Log AI usage after a request completes
   */
  async logUsage(input: {
    tenant_id: string
    user_id: string
    provider: 'groq' | 'openai' | 'anthropic' | 'fallback'
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_usd: number
    request_type: 'tutor_chat' | 'content_generation' | 'quiz_generation' | 'grading' | 'recommendation'
    request_id: string
    response_status: 'success' | 'error' | 'rate_limited' | 'fallback_used'
    error_message?: string
    response_time_ms: number
  }) {
    const { data, error } = await supabase.rpc('log_ai_usage', {
      p_tenant_id: input.tenant_id,
      p_user_id: input.user_id,
      p_provider: input.provider,
      p_model: input.model,
      p_prompt_tokens: input.prompt_tokens,
      p_completion_tokens: input.completion_tokens,
      p_total_tokens: input.total_tokens,
      p_cost_usd: input.cost_usd,
      p_request_type: input.request_type,
      p_request_id: input.request_id,
      p_response_status: input.response_status,
      p_error_message: input.error_message ?? null,
      p_response_time_ms: input.response_time_ms,
    })

    if (error) throw error
    return data as string // Returns log ID
  },

  /**
   * Get AI cost analytics
   */
  async getCostAnalytics(tenantId: string, days: number = 30) {
    const { data, error } = await supabase
      .from('mv_ai_cost_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('usage_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('usage_date', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  /**
   * Get user's AI usage summary
   */
  async getUserUsageSummary(userId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const logs = data ?? []
    const totalTokens = logs.reduce((sum, log) => sum + (log.total_tokens ?? 0), 0)
    const totalCost = logs.reduce((sum, log) => sum + (log.cost_usd ?? 0), 0)
    const successCount = logs.filter((log) => log.response_status === 'success').length
    const errorCount = logs.filter((log) => log.response_status === 'error').length

    return {
      totalRequests: logs.length,
      totalTokens,
      totalCost,
      successCount,
      errorCount,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
      recentLogs: logs,
    }
  },

  /**
   * Get AI quota info
   */
  async getQuotaInfo(tenantId: string, userId?: string) {
    const { data, error } = await supabase
      .from('ai_quotas')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(userId ? `user_id.eq.${userId},user_id.is.null` : 'user_id.is.null')
      .order('user_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  },
}
