export type ReportType = 'dashboard' | 'student_list' | 'course_summary' | 'engagement';
export type ReportSchedule = 'weekly' | 'monthly' | 'none';
export type ExportFormat = 'csv' | 'pdf';

export interface ScheduledReport {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  report_type: ReportType;
  config: Record<string, unknown>;
  schedule: ReportSchedule;
  export_format: ExportFormat;
  last_generated_at?: string;
  is_active: boolean;
  created_at: string;
}
