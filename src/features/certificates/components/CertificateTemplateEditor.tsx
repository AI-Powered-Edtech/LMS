import { Save, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

import { useSaveCertificateTemplate } from "../queries/certificateTemplateQueries";
import type { CertificateTemplate, CertificateTemplateInsert } from "../types";
import { DEFAULT_TEMPLATE } from "../types";
import { CertificateTemplatePreview } from "./CertificateTemplatePreview";

// ==========================================================================
// CertificateTemplateEditor
// Phase 36C — Form to create or edit a certificate template with live preview.
// ==========================================================================

export interface CertificateTemplateEditorProps {
  /** Existing template to edit. Omit to create a new one. */
  template?: CertificateTemplate;
  /** Pre-fill course_id for new templates. */
  courseId?: string;
  onSave: (saved: CertificateTemplate) => void;
  onCancel: () => void;
}

type FormValues = CertificateTemplateInsert & { id?: string };

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-transparent p-0.5"
        />
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {value}
        </span>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "rounded-lg border px-3 py-2 text-sm",
          "border-slate-300 bg-white text-slate-900 placeholder-slate-400",
          "dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
        )}
      />
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          value ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-600 shadow transition-transform",
            value ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export function CertificateTemplateEditor({
  template,
  courseId,
  onSave,
  onCancel,
}: CertificateTemplateEditorProps) {
  const { addToast } = useToast();
  const saveMutation = useSaveCertificateTemplate();

  const [values, setValues] = useState<FormValues>(() => ({
    id: template?.id,
    course_id: template?.course_id ?? courseId ?? null,
    name: template?.name ?? "",
    background_color:
      template?.background_color ?? DEFAULT_TEMPLATE.background_color,
    accent_color: template?.accent_color ?? DEFAULT_TEMPLATE.accent_color,
    logo_url: template?.logo_url ?? null,
    header_text: template?.header_text ?? DEFAULT_TEMPLATE.header_text,
    body_text: template?.body_text ?? DEFAULT_TEMPLATE.body_text,
    footer_text: template?.footer_text ?? DEFAULT_TEMPLATE.footer_text,
    show_date: template?.show_date ?? DEFAULT_TEMPLATE.show_date,
    show_score: template?.show_score ?? DEFAULT_TEMPLATE.show_score,
    show_teacher_sig:
      template?.show_teacher_sig ?? DEFAULT_TEMPLATE.show_teacher_sig,
    font_family: template?.font_family ?? DEFAULT_TEMPLATE.font_family,
    is_default: template?.is_default ?? false,
  }));

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.name.trim()) {
      addToast({ type: "warning", message: "Nama template wajib diisi" });
      return;
    }

    try {
      const saved = await saveMutation.mutateAsync(values);
      addToast({ type: "success", message: "Template berhasil disimpan" });
      onSave(saved);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      addToast({ type: "error", message: `Gagal menyimpan template: ${msg}` });
    }
  };

  // Sync id if template prop changes
  useEffect(() => {
    if (template?.id && !values.id) {
      setValues((prev) => ({ ...prev, id: template.id }));
    }
  }, [template?.id, values.id]);

  // Build a preview-compatible template object from current form values
  const previewTemplate = {
    ...values,
    background_color: values.background_color,
    accent_color: values.accent_color,
    header_text: values.header_text,
    body_text: values.body_text,
    footer_text: values.footer_text,
    show_date: values.show_date,
    show_score: values.show_score,
    show_teacher_sig: values.show_teacher_sig,
    font_family: values.font_family,
    logo_url: values.logo_url ?? null,
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
      {/* ── Form panel ────────────────────────────────────────── */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Template name */}
        <TextField
          id="tmpl-name"
          label="Nama Template"
          value={values.name}
          onChange={(v) => set("name", v)}
          placeholder="misal: Template Resmi Sekolah"
        />

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            id="tmpl-bg-color"
            label="Warna Latar"
            value={values.background_color}
            onChange={(v) => set("background_color", v)}
          />
          <ColorField
            id="tmpl-accent-color"
            label="Warna Aksen"
            value={values.accent_color}
            onChange={(v) => set("accent_color", v)}
          />
        </div>

        {/* Logo URL */}
        <TextField
          id="tmpl-logo-url"
          label="URL Logo (opsional)"
          value={values.logo_url ?? ""}
          onChange={(v) => set("logo_url", v || null)}
          placeholder="https://sekolah.sch.id/logo.png"
        />

        {/* Texts */}
        <TextField
          id="tmpl-header"
          label="Teks Header"
          value={values.header_text}
          onChange={(v) => set("header_text", v)}
          placeholder="Sertifikat Penyelesaian"
        />
        <TextField
          id="tmpl-body"
          label="Teks Pembuka"
          value={values.body_text}
          onChange={(v) => set("body_text", v)}
          placeholder="Dengan bangga diberikan kepada"
        />
        <TextField
          id="tmpl-footer"
          label="Teks Penutup"
          value={values.footer_text}
          onChange={(v) => set("footer_text", v)}
          placeholder="atas keberhasilan menyelesaikan kursus"
        />

        {/* Font family */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="tmpl-font"
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Font
          </label>
          <select
            id="tmpl-font"
            value={values.font_family}
            onChange={(e) =>
              set(
                "font_family",
                e.target.value as CertificateTemplate["font_family"],
              )
            }
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              "border-slate-300 bg-white text-slate-900",
              "dark:border-slate-600 dark:bg-slate-800 dark:text-white",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
            )}
          >
            <option value="serif">Serif (Georgia)</option>
            <option value="sans-serif">Sans-serif (System UI)</option>
            <option value="monospace">Monospace (Courier)</option>
          </select>
        </div>

        {/* Toggles */}
        <div
          className={cn(
            "rounded-xl border p-4 space-y-3",
            "border-slate-200 bg-slate-50",
            "dark:border-slate-700 dark:bg-slate-800/50",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tampilkan di sertifikat
          </p>
          <ToggleField
            label="Tanggal penyelesaian"
            value={values.show_date}
            onChange={(v) => set("show_date", v)}
          />
          <ToggleField
            label="Skor"
            value={values.show_score}
            onChange={(v) => set("show_score", v)}
          />
          <ToggleField
            label="Kolom tanda tangan pengajar"
            value={values.show_teacher_sig}
            onChange={(v) => set("show_teacher_sig", v)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold",
              "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
              "dark:bg-blue-500 dark:hover:bg-blue-600",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            )}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Menyimpan..." : "Simpan Template"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium",
              "border border-slate-300 text-slate-700 hover:bg-slate-50",
              "dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            )}
          >
            <X className="w-4 h-4" />
            Batal
          </button>
        </div>
      </div>

      {/* ── Live Preview panel ─────────────────────────────────── */}
      <motion.div layout className="lg:w-80 xl:w-96 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Pratinjau
        </p>
        <CertificateTemplatePreview
          template={previewTemplate}
          studentName="Nama Siswa"
          courseName="Nama Kursus"
          score={values.show_score ? 92 : undefined}
          className="w-full"
        />
        <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
          Pratinjau diperbarui secara langsung
        </p>
      </motion.div>
    </form>
  );
}
