/**
 * Certificate Template types
 * Phase 36C — Certificate Template Customization
 */

export interface CertificateTemplate {
  id: string;
  course_id: string | null;
  name: string;
  background_color: string;
  accent_color: string;
  logo_url: string | null;
  header_text: string;
  body_text: string;
  footer_text: string;
  show_date: boolean;
  show_score: boolean;
  show_teacher_sig: boolean;
  font_family: "serif" | "sans-serif" | "monospace";
  is_default: boolean;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CertificateTemplateInsert = Omit<
  CertificateTemplate,
  "id" | "tenant_id" | "created_by" | "created_at" | "updated_at"
>;

/** Default template values used when no template is configured */
export const DEFAULT_TEMPLATE: Omit<
  CertificateTemplate,
  "id" | "tenant_id" | "created_by" | "created_at" | "updated_at"
> = {
  course_id: null,
  name: "Template Default",
  background_color: "#ffffff",
  accent_color: "#2563eb",
  logo_url: null,
  header_text: "Sertifikat Penyelesaian",
  body_text: "Dengan bangga diberikan kepada",
  footer_text: "atas keberhasilan menyelesaikan kursus",
  show_date: true,
  show_score: false,
  show_teacher_sig: true,
  font_family: "serif",
  is_default: false,
};
