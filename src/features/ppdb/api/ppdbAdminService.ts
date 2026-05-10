import { db } from "@/services/db";

export interface PpdbPeriod {
  id: string;
  tenant_id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
}

export interface PpdbJalur {
  id: string;
  tenant_id: string;
  period_id: string;
  code: string;
  label: string;
  quota: number;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
}

export const ppdbAdminService = {
  async listPeriods(tenantId: string): Promise<PpdbPeriod[]> {
    const { data, error } = await db
      .from<Array<PpdbPeriod>>("ppdb_periods")
      .select("id, tenant_id, name, start_date, end_date, status")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PpdbPeriod[];
  },

  async listJalur(tenantId: string, periodId?: string): Promise<PpdbJalur[]> {
    let q = db
      .from<Array<PpdbJalur>>("ppdb_jalur")
      .select(
        "id, tenant_id, period_id, code, label, quota, description, starts_on, ends_on",
      )
      .eq("tenant_id", tenantId);
    if (periodId) q = q.eq("period_id", periodId);
    const { data, error } = await q.order("code", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PpdbJalur[];
  },

  async createJalur(input: {
    tenantId: string;
    periodId: string;
    code: string;
    label: string;
    quota: number;
    description?: string;
  }): Promise<PpdbJalur> {
    const { data, error } = await db
      .from<Array<PpdbJalur>>("ppdb_jalur")
      .insert({
        tenant_id: input.tenantId,
        period_id: input.periodId,
        code: input.code,
        label: input.label,
        quota: input.quota,
        description: input.description ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as PpdbJalur;
  },

  async refreshRanks(periodId: string): Promise<number> {
    const { data, error } = await db.rpc("refresh_ppdb_ranks", {
      p_period_id: periodId,
    });
    if (error) throw error;
    return data as unknown as number;
  },
};
