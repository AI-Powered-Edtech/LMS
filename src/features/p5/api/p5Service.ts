import { db } from "@/services/db";

export interface P5Theme {
  id: string;
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface P5Project {
  id: string;
  tenant_id: string;
  academic_year_id: string | null;
  theme_id: string | null;
  title: string;
  description: string | null;
  facilitator_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: "planned" | "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export const p5Service = {
  async listThemes(): Promise<P5Theme[]> {
    const { data, error } = await db
      .from<Array<P5Theme>>("p5_themes")
      .select("id, code, label, description, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as P5Theme[];
  },

  async listProjects(
    tenantId: string,
    academicYearId?: string | null,
  ): Promise<P5Project[]> {
    let q = db
      .from<Array<P5Project>>("p5_projects")
      .select("*")
      .eq("tenant_id", tenantId);
    if (academicYearId) q = q.eq("academic_year_id", academicYearId);
    const { data, error } = await q.order("starts_on", { ascending: false });
    if (error) throw error;
    return (data ?? []) as P5Project[];
  },

  async createProject(input: {
    tenantId: string;
    academicYearId: string | null;
    themeId: string | null;
    title: string;
    description?: string;
    startsOn?: string | null;
    endsOn?: string | null;
  }): Promise<P5Project> {
    const { data, error } = await db
      .from<Array<P5Project>>("p5_projects")
      .insert({
        tenant_id: input.tenantId,
        academic_year_id: input.academicYearId,
        theme_id: input.themeId,
        title: input.title,
        description: input.description ?? null,
        starts_on: input.startsOn ?? null,
        ends_on: input.endsOn ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as P5Project;
  },
};
