import { supabase } from '@/src/lib/supabase'

export type ReportStatus = 'pending' | 'approved' | 'rejected'
export type ReportReason = 'ai_generated' | 'inappropriate' | 'spam' | 'harassment' | 'other'
export type ContentType = 'post' | 'comment' | 'assignment' | 'user'

export interface Report {
  id: string
  contentId: string
  contentType: ContentType
  reporterId: string
  reporterName: string
  reason: ReportReason
  description: string
  status: ReportStatus
  timestamp: string
  contentSnippet?: string
  contentAuthor?: string
}

export const moderationService = {
  /**
   * Fetch all reports from content_reports table for the current tenant.
   */
  async fetchReports(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('content_reports')
      .select(
        'id, content_id, content_type, reporter_id, reporter_name, reason, description, status, content_snippet, content_author, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data || []).map((r) => ({
      id: r.id,
      contentId: r.content_id,
      contentType: r.content_type as ContentType,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name,
      reason: r.reason as ReportReason,
      description: r.description ?? '',
      status: r.status as ReportStatus,
      timestamp: r.created_at,
      contentSnippet: r.content_snippet ?? undefined,
      contentAuthor: r.content_author ?? undefined,
    }))
  },

  /**
   * Submit a new content report into content_reports table.
   */
  async submitReport(
    report: Omit<Report, 'id' | 'status' | 'timestamp' | 'reporterId' | 'reporterName'>,
    userId: string,
    userName: string
  ): Promise<Report> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Tidak terautentikasi')

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single()
    if (!roleData) throw new Error('Tenant tidak ditemukan')

    const { data, error } = await supabase
      .from('content_reports')
      .insert({
        tenant_id: roleData.tenant_id,
        content_id: report.contentId,
        content_type: report.contentType,
        reporter_id: userId,
        reporter_name: userName,
        reason: report.reason,
        description: report.description,
        content_snippet: report.contentSnippet,
        content_author: report.contentAuthor,
        status: 'pending',
      })
      .select(
        'id, content_id, content_type, reporter_id, reporter_name, reason, description, status, content_snippet, content_author, created_at'
      )
      .single()
    if (error) throw error
    return {
      id: data.id,
      contentId: data.content_id,
      contentType: data.content_type as ContentType,
      reporterId: data.reporter_id,
      reporterName: data.reporter_name,
      reason: data.reason as ReportReason,
      description: data.description ?? '',
      status: data.status as ReportStatus,
      timestamp: data.created_at,
      contentSnippet: data.content_snippet ?? undefined,
      contentAuthor: data.content_author ?? undefined,
    }
  },

  /**
   * Resolve a report (approve or reject) in content_reports table.
   */
  async resolveReport(reportId: string, status: 'approved' | 'rejected'): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')
    const { error } = await supabase
      .from('content_reports')
      .update({ status, resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq('id', reportId)
    if (error) throw error
  },
}
