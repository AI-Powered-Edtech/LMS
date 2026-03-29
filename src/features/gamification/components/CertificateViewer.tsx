import { Award, Calendar, Download } from 'lucide-react'

import { EmptyState, SkeletonCard } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { cn } from '@/src/utils/cn'
import { escapeHtml } from '@/src/utils/sanitize'

import { useStudentCertificates } from '../queries/gamificationQueries'
import type { Certificate } from '../types'

function CertificateCard({ cert }: { cert: Certificate }) {
  const { activeTenant, profile } = useAuth()

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return

    // SECURITY: All user-controlled values interpolated into document.write() MUST be
    // escaped via escapeHtml() to prevent Stored XSS. Profile name and course title are
    // stored in the database and can contain attacker-controlled content.
    const safeCertNumber = escapeHtml(cert.certificate_number)
    const safeTenantName = escapeHtml(activeTenant?.name ?? 'EduSync')
    const safeFirstName = escapeHtml(profile?.first_name ?? '')
    const safeLastName = escapeHtml(profile?.last_name ?? '')
    const safeCourseTitle = escapeHtml(cert.course_title)
    // issued_at is a server-generated timestamp — not user-controlled, no escape needed
    const issuedDate = new Date(cert.issued_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    w.document.write(`
            <!DOCTYPE html>
            <html><head><title>Sertifikat - ${safeCertNumber}</title>
            <style>
                @page { size: landscape; margin: 0; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Georgia, serif; background: #fff; }
                .cert { width: 900px; padding: 60px; border: 8px double #b8860b; text-align: center; position: relative; }
                .cert::before { content: ''; position: absolute; inset: 12px; border: 2px solid #daa520; }
                h1 { color: #1e3a5f; font-size: 36px; margin: 0 0 8px; }
                .school { color: #666; font-size: 14px; margin-bottom: 32px; }
                .label { color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
                .name { color: #1e3a5f; font-size: 28px; font-weight: bold; margin-bottom: 8px; }
                .course { color: #333; font-size: 20px; margin-bottom: 32px; }
                .meta { color: #888; font-size: 12px; margin-top: 24px; }
            </style></head><body>
            <div class="cert">
                <h1>SERTIFIKAT</h1>
                <p class="school">${safeTenantName}</p>
                <p class="label">Diberikan kepada</p>
                <p class="name">${safeFirstName} ${safeLastName}</p>
                <p class="label">Atas penyelesaian kursus</p>
                <p class="course">${safeCourseTitle}</p>
                <p class="meta">
                    ${issuedDate}
                    &nbsp;·&nbsp; ${safeCertNumber}
                </p>
            </div>
            </body></html>
        `)
    w.document.close()
    // SECURITY: Sever the window.opener reference so the print window cannot
    // access or manipulate the parent window's DOM / localStorage via JavaScript.
    w.opener = null
    setTimeout(() => {
      w.print()
    }, 300)
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 p-5 transition-shadow hover:shadow-md">
      <div className="absolute top-0 right-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-amber-100/50 dark:bg-amber-900/20" />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{cert.course_title}</h4>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              {new Date(cert.issued_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <Award className="h-8 w-8 text-amber-500 shrink-0" />
        </div>

        <p className="text-[11px] font-mono text-slate-400">{cert.certificate_number}</p>

        <button
          onClick={handlePrint}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold',
            'bg-amber-100 text-amber-700 hover:bg-amber-200',
            'dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50',
            'transition-colors'
          )}
        >
          <Download className="h-3.5 w-3.5" />
          Cetak PDF
        </button>
      </div>
    </div>
  )
}

export function CertificateViewer({ userId }: { userId?: string }) {
  const { data: certs, isLoading, error, refetch } = useStudentCertificates(userId)

  if (isLoading) return <SkeletonCard lines={2} />

  // Error state: surface API failures instead of silently showing empty state.
  // Previously query errors were swallowed — users saw a blank list with no feedback.
  if (error) {
    return (
      <EmptyState
        icon={<Award className="h-10 w-10" />}
        title="Gagal memuat sertifikat"
        description="Terjadi kesalahan saat mengambil data. Silakan coba lagi."
        action={{ label: 'Coba Lagi', onClick: () => refetch() }}
      />
    )
  }

  if (!certs || certs.length === 0) {
    return (
      <EmptyState
        icon={<Award className="h-10 w-10" />}
        title="Belum ada sertifikat"
        description="Selesaikan kursus untuk mendapatkan sertifikat."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certs.map((cert) => (
        <CertificateCard key={cert.id} cert={cert} />
      ))}
    </div>
  )
}
