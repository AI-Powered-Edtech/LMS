import {
  AlertTriangle,
  Award,
  Calendar as CalendarIcon,
  CheckCircle,
  Download,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Linkedin,
  Loader2,
  MessageCircle,
  Plus,
  QrCode,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EmptyState, SkeletonCard } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import type { Certificate } from '@/src/features/gamification'
import { useStudentCertificates } from '@/src/features/gamification'
import { certificateService } from '@/src/features/gamification/api/certificateService'
import { useDebounce } from '@/src/hooks/useDebounce'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'

export function Certificates() {
  const addToast = useToast((s) => s.addToast)
  usePageTitle('Sertifikat')
  const { activeRole, profile } = useAuth()
  // SECURITY FIX: Use activeRole (tenant-scoped) instead of global role
  const isTeacher = activeRole === 'teacher'
  const navigate = useNavigate()

  const { data: certificates = [], isLoading, isError } = useStudentCertificates()

  const [searchTerm, setSearchTerm] = useState('')
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null)

  // ⚡ Perf: Debounce search input to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchTerm, 300)

  const studentName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
    : 'Siswa'

  // ⚡ Perf: Memoize filteredCertificates — was recomputed on every render without useMemo
  const filteredCertificates = useMemo(
    () =>
      certificates.filter((cert) =>
        cert.course_title.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [certificates, debouncedSearch]
  )

  const highlightedCert = certificates.length > 0 ? certificates[0] : null

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleDownload = async (cert: Certificate, format: 'pdf' | 'png') => {
    setIsDownloading(cert.id)

    try {
      const blob = await certificateService.generatePdf({
        studentName,
        courseTitle: cert.course_title,
        completionDate: formatDate(cert.issued_at),
        tenantName: 'EduSync Academy',
        certificateNumber: cert.certificate_number,
      })

      if (format === 'png') {
        // For PNG, open the PDF in a new tab (server only generates PDF)
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${cert.course_title.replace(/\s+/g, '_')}_Sertifikat.pdf`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error generating certificate:', error)
      addToast({ type: 'error', message: 'Gagal mengunduh sertifikat. Silakan coba lagi.' })
    } finally {
      setIsDownloading(null)
    }
  }

  const handleShare = (platform: string, cert: Certificate) => {
    const text = `Saya baru saja mendapatkan sertifikat "${cert.course_title}" di EduSync! Lihat portofolio saya.`
    const url = `https://edusync.app/verify/${cert.certificate_number}`

    let shareUrl = ''
    if (platform === 'linkedin') {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    } else if (platform === 'whatsapp') {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank')
    }
    setShowShareMenu(null)
  }

  // --- Teacher View ---
  if (isTeacher) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Manajemen Sertifikat
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Desain template dan terbitkan sertifikat untuk siswa Anda.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app/teacher/settings')}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" /> Pengaturan
            </button>
            <button
              onClick={() =>
                addToast({ message: 'Fitur pembuat template akan segera hadir.', type: 'info' })
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Buat Template Baru
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Pembuat Template
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Desain layout sertifikat dengan fitur drag-and-drop. Atur posisi logo, teks dinamis
              (Nama, Nilai), dan tanda tangan digital.
            </p>
            <button
              onClick={() =>
                addToast({ message: 'Editor visual sertifikat akan segera hadir.', type: 'info' })
              }
              className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-200"
            >
              Buka Editor Visual
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Penerbitan Massal (Bulk Issuance)
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Terbitkan sertifikat secara otomatis untuk seluruh siswa dalam satu kelas yang telah
              memenuhi KKM atau menyelesaikan modul.
            </p>
            <button
              onClick={() =>
                addToast({
                  message: 'Penerbitan massal sertifikat akan segera hadir.',
                  type: 'info',
                })
              }
              className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-emerald-200"
            >
              Pilih Kelas & Terbitkan
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Student View ---
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-14 h-14 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Gagal Memuat Sertifikat
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Terjadi kesalahan saat memuat daftar sertifikat Anda. Silakan muat ulang halaman atau coba lagi nanti.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Sertifikat Saya
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Portofolio digital yang memvalidasi pencapaian akademik Anda.
          </p>
        </div>
      </div>

      {/* Highlighted Certificate */}
      {highlightedCert && (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 relative z-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-lg text-xs font-bold uppercase tracking-wider mb-4 border border-yellow-400/30">
                <Award className="w-4 h-4" /> Sertifikat Terbaru
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                {highlightedCert.course_title}
              </h2>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span>
                    Diterbitkan oleh <strong className="text-white">EduSync Academy</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  <span>
                    Diberikan pada{' '}
                    <strong className="text-white">{formatDate(highlightedCert.issued_at)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Kursus Selesai</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleDownload(highlightedCert, 'pdf')}
                  disabled={isDownloading === highlightedCert.id}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70"
                >
                  {isDownloading === highlightedCert.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                  Unduh PDF
                </button>
                <button
                  onClick={() => handleDownload(highlightedCert, 'png')}
                  disabled={isDownloading === highlightedCert.id}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-2 transition-colors backdrop-blur-sm disabled:opacity-70"
                >
                  <ImageIcon className="w-5 h-5" />
                  Unduh PNG
                </button>
              </div>
            </div>

            <div className="w-full md:w-1/3 shrink-0 flex flex-col items-center justify-center bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md">
              <QrCode className="w-32 h-32 text-white opacity-80 mb-4" />
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                  ID Sertifikat Resmi
                </div>
                <div className="font-mono font-bold text-blue-300">
                  {highlightedCert.certificate_number}
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center mt-4">
                Pindai QR untuk verifikasi keaslian di platform EduSync.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery & Filters */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {certificates.length > 0 ? 'Semua Sertifikat' : 'Sertifikat'}
          </h2>
          {certificates.length > 0 && (
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari sertifikat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm shadow-sm"
              />
            </div>
          )}
        </div>

        {certificates.length === 0 ? (
          <EmptyState
            icon={<Award className="w-16 h-16" />}
            title="Belum ada sertifikat"
            description="Selesaikan kursus untuk mendapatkan sertifikat penyelesaian. Sertifikat akan terbit otomatis saat semua modul selesai."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col"
              >
                {/* Certificate preview header */}
                <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
                  <div className="text-center z-10 px-6">
                    <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white font-bold text-sm line-clamp-2">{cert.course_title}</p>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/30">
                      Penyelesaian Kursus
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
                    {cert.course_title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    EduSync Academy
                  </p>
                  <p className="text-slate-400 text-xs flex items-center gap-1.5 mb-4">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDate(cert.issued_at)}
                  </p>
                  <p className="text-xs font-mono text-slate-400 mb-4">{cert.certificate_number}</p>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowShareMenu(showShareMenu === cert.id ? null : cert.id)}
                        className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title="Bagikan"
                        aria-label="Bagikan sertifikat"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {showShareMenu === cert.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-20"
                          >
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() => handleShare('linkedin', cert)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                              >
                                <Linkedin className="w-4 h-4" /> LinkedIn
                              </button>
                              <button
                                onClick={() => handleShare('whatsapp', cert)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                              </button>
                              <button
                                onClick={() => handleShare('twitter', cert)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-700 rounded-xl transition-colors"
                              >
                                <Share2 className="w-4 h-4" /> Twitter / X
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(cert, 'png')}
                        disabled={isDownloading === cert.id}
                        className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title="Unduh PNG"
                        aria-label="Unduh sertifikat format PNG"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(cert, 'pdf')}
                        disabled={isDownloading === cert.id}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 text-slate-700 dark:text-slate-300 hover:text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700 hover:border-blue-200"
                      >
                        {isDownloading === cert.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredCertificates.length === 0 && certificates.length > 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              Tidak ditemukan
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Sertifikat yang Anda cari tidak ditemukan.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
