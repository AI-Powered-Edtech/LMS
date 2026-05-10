import { db } from "@/services/db";

import type {
  ExportFormat,
  ReportSchedule,
  ReportType,
  ScheduledReport,
} from "../types";

export const reportService = {
  async saveReport(params: {
    name: string;
    reportType: ReportType;
    config?: Record<string, unknown>;
    schedule?: ReportSchedule;
    exportFormat?: ExportFormat;
    reportId?: string;
  }): Promise<ScheduledReport> {
    const { data, error } = await db.rpc("save_scheduled_report", {
      p_name: params.name,
      p_report_type: params.reportType,
      p_config: params.config ?? {},
      p_schedule: params.schedule ?? "none",
      p_export_format: params.exportFormat ?? "csv",
      p_report_id: params.reportId ?? null,
    });
    if (error) throw error;
    return data as unknown as ScheduledReport;
  },

  async getReports(): Promise<ScheduledReport[]> {
    const { data, error } = await db.rpc("get_scheduled_reports");
    if (error) throw error;
    return (data as ScheduledReport[]) ?? [];
  },

  async deleteReport(reportId: string): Promise<void> {
    const { error } = await db.rpc("delete_scheduled_report", {
      p_report_id: reportId,
    });
    if (error) throw error;
  },

  async generateReportData(
    reportId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await db.rpc("generate_report_data", {
      p_report_id: reportId,
    });
    if (error) throw error;
    return (data as Record<string, unknown>[]) ?? [];
  },
};
