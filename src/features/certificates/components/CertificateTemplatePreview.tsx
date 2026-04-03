import { Award } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { CertificateTemplate } from '../types'

// ==========================================================================
// CertificateTemplatePreview
// Phase 36C — Live certificate preview driven by template settings.
// ==========================================================================

export interface CertificateTemplatePreviewProps {
  template: Partial<CertificateTemplate> &
    Pick<
      CertificateTemplate,
      | 'background_color'
      | 'accent_color'
      | 'header_text'
      | 'body_text'
      | 'footer_text'
      | 'font_family'
      | 'show_date'
      | 'show_score'
      | 'show_teacher_sig'
    >
  studentName?: string
  courseName?: string
  completionDate?: string
  /** Score as a percentage 0-100 */
  score?: number
  className?: string
}

const fontFamilyMap: Record<string, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  'sans-serif': 'system-ui, -apple-system, "Segoe UI", sans-serif',
  monospace: '"Courier New", Courier, monospace',
}

export function CertificateTemplatePreview({
  template,
  studentName = 'Budi Santoso',
  courseName = 'Nama Kursus',
  completionDate,
  score,
  className,
}: CertificateTemplatePreviewProps) {
  const displayDate =
    completionDate ??
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const fontFamily = fontFamilyMap[template.font_family ?? 'serif'] ?? fontFamilyMap['serif']
  const bg = template.background_color ?? '#ffffff'
  const accent = template.accent_color ?? '#2563eb'

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl shadow-md', className)}
      style={{ fontFamily, backgroundColor: bg }}
    >
      {/* Outer border accent */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ border: `3px solid ${accent}`, opacity: 0.6 }}
        aria-hidden="true"
      />
      {/* Inner decorative line */}
      <div
        className="absolute inset-[6px] rounded-lg pointer-events-none"
        style={{ border: `1px solid ${accent}`, opacity: 0.3 }}
        aria-hidden="true"
      />

      <div className="relative px-8 py-8 text-center space-y-4">
        {/* Logo */}
        {template.logo_url ? (
          <div className="flex justify-center mb-2">
            <img
              src={template.logo_url}
              alt="Logo sekolah"
              className="h-14 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="flex justify-center mb-2" aria-hidden="true">
            <Award className="h-12 w-12" style={{ color: accent }} />
          </div>
        )}

        {/* Header text */}
        <h2 className="text-2xl font-bold tracking-wide uppercase" style={{ color: accent }}>
          {template.header_text || 'Sertifikat Penyelesaian'}
        </h2>

        {/* Decorative divider */}
        <div
          className="mx-auto h-px w-24 my-2"
          style={{ backgroundColor: accent, opacity: 0.4 }}
          aria-hidden="true"
        />

        {/* Body text */}
        <p className="text-sm uppercase tracking-widest" style={{ color: '#6b7280' }}>
          {template.body_text || 'Dengan bangga diberikan kepada'}
        </p>

        {/* Student name */}
        <p className="text-3xl font-bold" style={{ color: '#1e293b' }}>
          {studentName}
        </p>

        {/* Footer text + course name */}
        <p className="text-sm" style={{ color: '#6b7280' }}>
          {template.footer_text || 'atas keberhasilan menyelesaikan kursus'}
        </p>
        <p className="text-lg font-semibold" style={{ color: '#1e293b' }}>
          {courseName}
        </p>

        {/* Meta: date and/or score */}
        {(template.show_date || template.show_score) && (
          <div
            className="flex items-center justify-center gap-4 text-xs pt-2 pb-1"
            style={{ color: '#9ca3af' }}
          >
            {template.show_date && <span>{displayDate}</span>}
            {template.show_date && template.show_score && <span aria-hidden="true">&middot;</span>}
            {template.show_score && score !== undefined && <span>Nilai: {score}%</span>}
          </div>
        )}

        {/* Teacher signature line */}
        {template.show_teacher_sig && (
          <div className="pt-4 flex justify-center">
            <div className="text-center">
              <div
                className="w-28 border-b mx-auto mb-1"
                style={{ borderColor: '#d1d5db' }}
                aria-hidden="true"
              />
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                Tanda tangan pengajar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
