import { db } from "@/services/db";

import type { CertificateTemplate, CertificateTemplateInsert } from "../types";

const COLUMNS =
  "id, course_id, name, background_color, accent_color, logo_url, header_text, body_text, footer_text, show_date, show_score, show_teacher_sig, font_family, is_default, tenant_id, created_by, created_at, updated_at";

/**
 * Certificate Template Service
 * Phase 36C — CRUD for certificate templates per tenant/course.
 */
export const certificateTemplateService = {
  /**
   * Get all certificate templates for a tenant.
   * Returns default templates first, then sorted alphabetically.
   */
  async getTemplates(tenantId: string): Promise<CertificateTemplate[]> {
    const { data, error } = await db
      .from("certificate_templates")
      .select(COLUMNS)
      .eq("tenant_id", tenantId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
      .limit(50);

    if (error) throw error;
    return (data ?? []) as CertificateTemplate[];
  },

  /**
   * Get the template assigned to a specific course, falling back to the
   * tenant's default template if no course-specific template exists.
   */
  async getTemplateByCourse(
    courseId: string,
    tenantId: string,
  ): Promise<CertificateTemplate | null> {
    // First: try course-specific template
    const { data: courseTemplate } = await db
      .from("certificate_templates")
      .select(COLUMNS)
      .eq("course_id", courseId)
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    if (courseTemplate) return courseTemplate as CertificateTemplate;

    // Fallback: tenant's default template
    const { data: defaultTemplate } = await db
      .from("certificate_templates")
      .select(COLUMNS)
      .eq("tenant_id", tenantId)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();

    return (defaultTemplate as CertificateTemplate) ?? null;
  },

  /**
   * Create or update a certificate template.
   * If template.id exists, performs an UPDATE; otherwise INSERT.
   */
  async saveTemplate(
    template: CertificateTemplateInsert & { id?: string },
    tenantId: string,
  ): Promise<CertificateTemplate> {
    if (template.id) {
      // Update existing
      const { id, ...updates } = template;
      const { data, error } = await db
        .from("certificate_templates")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select(COLUMNS)
        .single();

      if (error) throw error;
      return data as unknown as CertificateTemplate;
    }

    // Insert new
    const { data, error } = await db
      .from("certificate_templates")
      .insert({ ...template, tenant_id: tenantId })
      .select(COLUMNS)
      .single();

    if (error) throw error;
    return data as unknown as CertificateTemplate;
  },

  /**
   * Set a template as the tenant default.
   * Clears the is_default flag on all other templates first.
   */
  async setDefault(templateId: string, tenantId: string): Promise<void> {
    // Clear all defaults for this tenant
    const { error: clearError } = await db
      .from("certificate_templates")
      .update({ is_default: false })
      .eq("tenant_id", tenantId);

    if (clearError) throw clearError;

    // Set the new default
    const { error: setError } = await db
      .from("certificate_templates")
      .update({ is_default: true })
      .eq("id", templateId)
      .eq("tenant_id", tenantId);

    if (setError) throw setError;
  },

  /**
   * Delete a certificate template by id.
   */
  async deleteTemplate(templateId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from("certificate_templates")
      .delete()
      .eq("id", templateId)
      .eq("tenant_id", tenantId);

    if (error) throw error;
  },
};
