import { db } from "@/services/db";

export type AcademicYearStatus = "planned" | "active" | "archived";

export interface AcademicYear {
  id: string;
  tenant_id: string;
  label: string;
  starts_on: string; // ISO date
  ends_on: string;
  status: AcademicYearStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const COLUMNS =
  "id, tenant_id, label, starts_on, ends_on, status, created_at, updated_at, created_by";

export const academicYearService = {
  async list(tenantId: string): Promise<AcademicYear[]> {
    const { data, error } = await db
      .from<Array<AcademicYear>>("academic_years")
      .select(COLUMNS)
      .eq("tenant_id", tenantId)
      .order("starts_on", { ascending: false });
    if (error) throw error;
    return (data ?? []) as AcademicYear[];
  },

  async getActive(tenantId: string): Promise<AcademicYear | null> {
    const { data, error } = await db
      .from<Array<AcademicYear>>("academic_years")
      .select(COLUMNS)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as AcademicYear | null;
  },

  async create(input: {
    tenantId: string;
    label: string;
    startsOn: string;
    endsOn: string;
    createdBy: string | null;
  }): Promise<AcademicYear> {
    const { data, error } = await db
      .from<Array<AcademicYear>>("academic_years")
      .insert({
        tenant_id: input.tenantId,
        label: input.label,
        starts_on: input.startsOn,
        ends_on: input.endsOn,
        status: "planned",
        created_by: input.createdBy,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data as unknown as AcademicYear;
  },

  async setActive(tenantId: string, yearId: string): Promise<AcademicYear> {
    const { data, error } = await db.rpc("set_active_academic_year", {
      p_tenant_id: tenantId,
      p_year_id: yearId,
    });
    if (error) {
      if (error.code === "P0002")
        throw new Error("Tahun ajaran tidak ditemukan");
      if (error.code === "P0003")
        throw new Error(
          "Tahun ajaran yang sudah diarsipkan tidak dapat diaktifkan kembali",
        );
      throw error;
    }
    return data as unknown as AcademicYear;
  },

  async archive(yearId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from<Array<AcademicYear>>("academic_years")
      .update({ status: "archived" })
      .eq("id", yearId)
      .eq("tenant_id", tenantId);
    if (error) throw error;
  },
};
