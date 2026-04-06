/**
 * Certificate Verification Service
 * 
 * Provides methods for certificate validation, batch generation, and template validation.
 */

import { supabase } from '@/services/supabase/client'

/**
 * Service for certificate verification API calls
 */
export const certificateVerificationService = {
  /**
   * Verify a certificate by verification code
   */
  async verifyCertificate(
    verificationCode: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const { data, error } = await supabase.rpc('verify_certificate', {
      p_verification_code: verificationCode,
      p_ip_address: ipAddress ?? null,
      p_user_agent: userAgent ?? null,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    return row as {
      is_valid: boolean
      certificate_id: string
      student_name: string
      course_name: string
      issued_at: string
      template_name: string
      message: string
    }
  },

  /**
   * Validate a certificate template
   */
  async validateTemplate(templateId: string) {
    const { data, error } = await supabase.rpc('validate_certificate_template', {
      p_template_id: templateId,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    return row as {
      is_valid: boolean
      errors: Array<{ field: string; message: string }>
      warnings: Array<{ field: string; message: string }>
    }
  },

  /**
   * Create a batch certificate generation job
   */
  async createBatchJob(input: {
    tenant_id: string
    template_id: string
    course_id?: string
    class_id?: string
    student_ids: string[]
    created_by: string
  }) {
    const { data, error } = await supabase
      .from('certificate_batch_jobs')
      .insert({
        tenant_id: input.tenant_id,
        template_id: input.template_id,
        course_id: input.course_id ?? null,
        class_id: input.class_id ?? null,
        student_ids: input.student_ids,
        total_count: input.student_ids.length,
        created_by: input.created_by,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get batch job status
   */
  async getBatchJobStatus(jobId: string) {
    const { data, error } = await supabase
      .from('certificate_batch_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  /**
   * Update batch job progress
   */
  async updateBatchJobProgress(
    jobId: string,
    updates: {
      processed_count?: number
      success_count?: number
      failed_count?: number
      status?: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
      error_message?: string
    }
  ) {
    const { error } = await supabase
      .from('certificate_batch_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        ...(updates.status === 'completed' || updates.status === 'failed'
          ? { completed_at: new Date().toISOString() }
          : {}),
        ...(updates.status === 'processing' && !updates.started_at
          ? { started_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', jobId)

    if (error) throw error
  },

  /**
   * Get certificate analytics
   */
  async getCertificateAnalytics(tenantId: string, days: number = 30) {
    const { data, error } = await supabase
      .from('mv_certificate_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('issue_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('issue_date', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  /**
   * Get verification history for a certificate
   */
  async getVerificationHistory(certificateId: string) {
    const { data, error } = await supabase
      .from('certificate_verifications')
      .select('*')
      .eq('certificate_id', certificateId)
      .order('verified_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },
}
