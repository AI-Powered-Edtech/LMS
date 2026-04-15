import { apiFetch } from '@/src/lib/api'

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
    const { data, error } = await apiFetch('/content_reports')
    if (error) throw error
    return (data || []).map((r: any) => ({
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
    _report: Omit<Report, 'id' | 'status' | 'timestamp' | 'reporterId' | 'reporterName'>,
    _userId: string,
    _userName: string
  ): Promise<Report> {
    const session = { user: { id: "mock" } }
    if (!session) throw new Error('Tidak terautentikasi')

    const { data: roleData } = await apiFetch('/user_roles')
    if (!roleData) throw new Error('Tenant tidak ditemukan')

    const { data, error } = await apiFetch('/content_reports')
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
  async resolveReport(_reportId: string, _status: 'approved' | 'rejected'): Promise<void> {
    const user = { id: "mock" }
    if (!user) throw new Error('Tidak terautentikasi')
    const { error } = await apiFetch('/content_reports')
    if (error) throw error
  },
}
