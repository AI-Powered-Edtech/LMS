import { db } from "@/services/db";

export interface IntegrationConfig {
  id: string;
  tenant_id: string;
  integration: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DapodikExportJob {
  id: string;
  tenant_id: string;
  requested_by: string | null;
  export_scope: "students" | "staff" | "rombel" | "all";
  semester_id: string | null;
  file_url: string | null;
  row_count: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export const integrationService = {
  async list(tenantId: string): Promise<IntegrationConfig[]> {
    const { data, error } = await db
      .from<Array<IntegrationConfig>>("integration_configs")
      .select(
        "id, tenant_id, integration, is_enabled, config, created_at, updated_at",
      )
      .eq("tenant_id", tenantId)
      .order("integration", { ascending: true });
    if (error) throw error;
    return (data ?? []) as IntegrationConfig[];
  },

  async upsert(input: {
    tenantId: string;
    integration: string;
    isEnabled: boolean;
    config?: Record<string, unknown>;
  }): Promise<IntegrationConfig> {
    const { data: existing } = await db
      .from<Array<IntegrationConfig>>("integration_configs")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("integration", input.integration)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data, error } = await db
        .from<Array<IntegrationConfig>>("integration_configs")
        .update({
          is_enabled: input.isEnabled,
          config: input.config ?? {},
        })
        .eq("id", (existing as unknown as IntegrationConfig).id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as IntegrationConfig;
    }

    const { data, error } = await db
      .from<Array<IntegrationConfig>>("integration_configs")
      .insert({
        tenant_id: input.tenantId,
        integration: input.integration,
        is_enabled: input.isEnabled,
        config: input.config ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as IntegrationConfig;
  },

  async listDapodikJobs(tenantId: string): Promise<DapodikExportJob[]> {
    const { data, error } = await db
      .from<Array<DapodikExportJob>>("dapodik_export_jobs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as DapodikExportJob[];
  },

  async createDapodikJob(input: {
    tenantId: string;
    scope: "students" | "staff" | "rombel" | "all";
    semesterId?: string | null;
  }): Promise<DapodikExportJob> {
    const { data, error } = await db
      .from<Array<DapodikExportJob>>("dapodik_export_jobs")
      .insert({
        tenant_id: input.tenantId,
        export_scope: input.scope,
        semester_id: input.semesterId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as DapodikExportJob;
  },
};
