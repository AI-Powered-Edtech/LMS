import { apiFetch } from '@/src/lib/api'

import type { ExportFormat, ReportSchedule, ReportType, ScheduledReport } from '../types'

export const reportService = {
  async saveReport(params: {
    name: string
    reportType: ReportType
    config?: Record<string, unknown>
    schedule?: ReportSchedule
    exportFormat?: ExportFormat
    reportId?: string
  }): Promise<ScheduledReport> {
    const { data, error } = await apiFetch('/rpc/save_scheduled_report', { method: 'POST', body: JSON.stringify({
          p_name: params.name,
          p_report_type: params.reportType,
          p_config: params.config ?? {},
          p_schedule: params.schedule ?? 'none',
          p_export_format: params.exportFormat ?? 'csv',
          p_report_id: params.reportId ?? null,
        }) })
    if (error) throw error
    return data as ScheduledReport
  },

  async getReports(): Promise<ScheduledReport[]> {
    const { data, error } = await apiFetch('/rpc/get_scheduled_reports', { method: 'POST' })
    if (error) throw error
    return (data as ScheduledReport[]) ?? []
  },

  async deleteReport(reportId: string): Promise<void> {
    const { error } = await apiFetch('/rpc/delete_scheduled_report', { method: 'POST', body: JSON.stringify({ p_report_id: reportId }) })
    if (error) throw error
  },

  async generateReportData(reportId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await apiFetch('/rpc/generate_report_data', { method: 'POST', body: JSON.stringify({ p_report_id: reportId }) })
    if (error) throw error
    return (data as Record<string, unknown>[]) ?? []
  },
}
