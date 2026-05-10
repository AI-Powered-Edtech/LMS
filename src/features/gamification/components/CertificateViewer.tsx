import { Award, Calendar, Download } from "lucide-react";

import { EmptyState, SkeletonCard } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { certificateTemplateService } from "@/features/certificates/api/certificateTemplateService";
import type { CertificateTemplate } from "@/features/certificates/types";
import { cn } from "@/utils/cn";
import { escapeHtml } from "@/utils/sanitize";

import { useStudentCertificates } from "../queries/gamificationQueries";
import type { Certificate } from "../types";

function CertificateCard({ cert }: { cert: Certificate }) {
  const { activeTenant, profile, tenantId } = useAuth();

  /**
   * Build the print HTML for the certificate, applying custom template
   * colors and text if one is configured for the course.
   */
  const handlePrint = async () => {
    // SECURITY: All user-controlled values MUST be escaped via escapeHtml().
    const safeCertNumber = escapeHtml(cert.certificate_number);
    const safeTenantName = escapeHtml(activeTenant?.name ?? "EduSync");
    const safeFirstName = escapeHtml(profile?.first_name ?? "");
    const safeLastName = escapeHtml(profile?.last_name ?? "");
    const safeCourseTitle = escapeHtml(cert.course_title);
    // issued_at is a server-generated timestamp — not user-controlled, no escape needed
    const issuedDate = new Date(cert.issued_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Phase 36C: Fetch custom template for this course (or fall back to default)
    let tmpl: CertificateTemplate | null = null;
    if (cert.course_id && tenantId) {
      try {
        tmpl = await certificateTemplateService.getTemplateByCourse(
          cert.course_id,
          tenantId,
        );
      } catch {
        // Template fetch is best-effort; fall back to hardcoded design
      }
    }

    // Template-aware style values
    const bgColor = tmpl?.background_color ?? "#ffffff";
    const accentColor = tmpl?.accent_color ?? "#1e3a5f";
    const fontFamily =
      tmpl?.font_family === "sans-serif"
        ? "system-ui, sans-serif"
        : tmpl?.font_family === "monospace"
          ? '"Courier New", monospace'
          : "Georgia, serif";
    const headerText = escapeHtml(tmpl?.header_text ?? "SERTIFIKAT");
    const bodyText = escapeHtml(tmpl?.body_text ?? "Diberikan kepada");
    const footerText = escapeHtml(
      tmpl?.footer_text ?? "Atas penyelesaian kursus",
    );
    const showDate = tmpl?.show_date ?? true;
    const showSig = tmpl?.show_teacher_sig ?? true;
    const logoUrl = tmpl?.logo_url ? escapeHtml(tmpl.logo_url) : null;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="Logo" style="height:60px;object-fit:contain;margin-bottom:16px;" />`
      : "";

    const sigHtml = showSig
      ? `<div style="margin-top:40px;text-align:center;">
           <div style="width:120px;border-top:1px solid #d1d5db;margin:0 auto 4px;"></div>
           <p style="color:#9ca3af;font-size:11px;">Tanda tangan pengajar</p>
         </div>`
      : "";

    const htmlString = `<!DOCTYPE html>
<html><head><title>Sertifikat - ${safeCertNumber}</title>
<style>
    @page { size: landscape; margin: 0; }
    body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh;
           font-family: ${fontFamily}; background: ${bgColor}; }
    .cert { width: 900px; padding: 60px; text-align: center; position: relative;
            border: 4px solid ${accentColor}; background: ${bgColor}; }
    .cert::before { content: ''; position: absolute; inset: 10px; border: 1px solid ${accentColor}; opacity: 0.35; }
    .logo { display:flex; justify-content:center; margin-bottom:8px; }
    h1 { color: ${accentColor}; font-size: 34px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 2px; }
    .school { color: #6b7280; font-size: 13px; margin-bottom: 28px; }
    .label { color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
    .name { color: #1e293b; font-size: 30px; font-weight: bold; margin-bottom: 8px; }
    .course { color: #374151; font-size: 20px; margin-bottom: 24px; }
    .meta { color: #9ca3af; font-size: 11px; margin-top: 16px; }
</style></head><body>
<div class="cert">
    <div class="logo">${logoHtml}</div>
    <h1>${headerText}</h1>
    <p class="school">${safeTenantName}</p>
    <p class="label">${bodyText}</p>
    <p class="name">${safeFirstName} ${safeLastName}</p>
    <p class="label">${footerText}</p>
    <p class="course">${safeCourseTitle}</p>
    ${showDate ? `<p class="meta">${issuedDate} &nbsp;·&nbsp; ${safeCertNumber}</p>` : `<p class="meta">${safeCertNumber}</p>`}
    ${sigHtml}
</div>
</body></html>`;

    // PERFORMANCE: Use Blob URL instead of document.write() to avoid blocking
    // the main thread. document.write() is synchronous and can freeze the UI
    // for 200-500ms on large HTML — especially noticeable at this emotionally
    // significant moment for students.
    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);

    const printWindow = window.open(blobUrl, "_blank");
    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      return;
    }

    // Revoke blob URL after the window has loaded to free memory,
    // then trigger print. The window remains open because the browser
    // has already parsed the HTML.
    printWindow.onload = () => {
      URL.revokeObjectURL(blobUrl);
      setTimeout(() => printWindow.print(), 300);
    };
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 p-5 transition-shadow hover:shadow-md">
      <div className="absolute top-0 right-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-amber-100/50 dark:bg-amber-900/20" />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              {cert.course_title}
            </h4>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              {new Date(cert.issued_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Award className="h-8 w-8 text-amber-500 shrink-0" />
        </div>

        <p className="text-[11px] font-mono text-slate-400">
          {cert.certificate_number}
        </p>

        <button
          onClick={handlePrint}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold",
            "bg-amber-100 text-amber-700 hover:bg-amber-200",
            "dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
            "transition-colors",
          )}
        >
          <Download className="h-3.5 w-3.5" />
          Cetak PDF
        </button>
      </div>
    </div>
  );
}

export function CertificateViewer({ userId }: { userId?: string }) {
  const {
    data: certs,
    isLoading,
    error,
    refetch,
  } = useStudentCertificates(userId);

  if (isLoading) return <SkeletonCard lines={2} />;

  // Error state: surface API failures instead of silently showing empty state.
  // Previously query errors were swallowed — users saw a blank list with no feedback.
  if (error) {
    return (
      <EmptyState
        icon={<Award className="h-10 w-10" />}
        title="Gagal memuat sertifikat"
        description="Terjadi kesalahan saat mengambil data. Silakan coba lagi."
        action={{ label: "Coba Lagi", onClick: () => refetch() }}
      />
    );
  }

  if (!certs || certs.length === 0) {
    return (
      <EmptyState
        icon={<Award className="h-10 w-10" />}
        title="Belum ada sertifikat"
        description="Selesaikan kursus untuk mendapatkan sertifikat."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certs.map((cert) => (
        <CertificateCard key={cert.id} cert={cert} />
      ))}
    </div>
  );
}
