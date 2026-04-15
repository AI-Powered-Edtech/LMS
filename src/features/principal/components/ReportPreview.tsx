// ==========================================================================
// ReportPreview — Halaman preview laporan eksekutif yang bisa di-print
//
// Sections:
//   1. Header: nama sekolah, periode, tanggal generate
//   2. Ringkasan Eksekutif: 4 metric utama dalam tabel
//   3. Tren Aktivitas: tabel data bulanan
//   4. Kinerja Akademik: nilai rata-rata, kelulusan, at-risk
//   5. Adopsi Platform: persentase guru + siswa aktif
//   6. ROI: estimasi penghematan
//   7. Footer: "Dibuat oleh EduSync LMS"
//
// Print: @media print styles menggunakan light theme + layout A4
// ==========================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { readVilSession } from '@/services/auth/vilSession'

import type { ExecutiveReportData } from '../types'
import { exportToCSV, exportToPDF } from '../utils/reportExport'

/* ─── Formatters ───────────────────────────────────────────── */

const fmtNumber = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))
const fmtPercent = (n: number) =>
  `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n)}%`
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

function fmtDateLong(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─── Print-friendly table classes ────────────────────────── */

const TABLE_CLS = 'w-full border-collapse text-sm print:text-xs'
const TH_CLS =
  'border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-700 print:bg-slate-100'
const TD_CLS = 'border border-slate-300 px-3 py-2 text-slate-700'
const TD_RIGHT_CLS = 'border border-slate-300 px-3 py-2 text-slate-700 text-right tabular-nums'
const SECTION_TITLE =
  'text-base font-bold text-slate-800 mb-3 mt-6 first:mt-0 uppercase tracking-wide border-b-2 border-slate-800 pb-1'

/* ─── Section: Header ──────────────────────────────────────── */

function ReportHeader({ data }: { data: ExecutiveReportData }) {
  return (
    <div className="mb-8 pb-6 border-b-2 border-slate-800">
      {/* Logo row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-widest mb-1">
            EduSync LMS
          </div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{data.schoolName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tahun Ajaran {data.academicYear}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">
            {data.reportType === 'monthly'
              ? 'Laporan Bulanan'
              : data.reportType === 'academic'
                ? 'Laporan Akademik'
                : 'Laporan ROI & Adopsi Platform'}
          </div>
          <div className="text-sm text-slate-500 mt-1">Periode: {data.period}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Dibuat: {fmtDateLong(data.generatedAt)}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Section: Ringkasan Eksekutif ─────────────────────────── */

function ExecutiveSummarySection({ data }: { data: ExecutiveReportData }) {
  const topMetrics = data.metrics.slice(0, 4)
  return (
    <section>
      <h2 className={SECTION_TITLE}>Ringkasan Eksekutif</h2>
      <table className={TABLE_CLS}>
        <thead>
          <tr>
            <th className={TH_CLS}>Metrik</th>
            <th className={`${TH_CLS} text-right`}>Nilai</th>
            <th className={TH_CLS}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {topMetrics.map((m) => (
            <tr key={m.label}>
              <td className={TD_CLS}>{m.label}</td>
              <td className={TD_RIGHT_CLS}>{m.value}</td>
              <td className={TD_CLS}>{m.sub ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/* ─── Section: Tren Aktivitas ──────────────────────────────── */

function ActivityTrendSection({ data }: { data: ExecutiveReportData }) {
  return (
    <section>
      <h2 className={SECTION_TITLE}>Tren Aktivitas Bulanan</h2>
      <table className={TABLE_CLS}>
        <thead>
          <tr>
            <th className={TH_CLS}>Bulan</th>
            <th className={`${TH_CLS} text-right`}>Siswa Aktif</th>
            <th className={`${TH_CLS} text-right`}>Penyelesaian Pelajaran</th>
            <th className={`${TH_CLS} text-right`}>Percobaan Kuis</th>
          </tr>
        </thead>
        <tbody>
          {data.monthlyTrend.map((row) => (
            <tr key={row.month}>
              <td className={TD_CLS}>{row.month}</td>
              <td className={TD_RIGHT_CLS}>{fmtNumber(row.active_students)}</td>
              <td className={TD_RIGHT_CLS}>{fmtNumber(row.lesson_completions)}</td>
              <td className={TD_RIGHT_CLS}>{fmtNumber(row.quiz_attempts)}</td>
            </tr>
          ))}
          {data.monthlyTrend.length === 0 && (
            <tr>
              <td colSpan={4} className={`${TD_CLS} text-center text-slate-400`}>
                Belum ada data tren aktivitas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

/* ─── Section: Kinerja Akademik ────────────────────────────── */

function AcademicSection({ data }: { data: ExecutiveReportData }) {
  const { academic } = data
  return (
    <section>
      <h2 className={SECTION_TITLE}>Kinerja Akademik</h2>
      <table className={TABLE_CLS}>
        <thead>
          <tr>
            <th className={TH_CLS}>Indikator</th>
            <th className={`${TH_CLS} text-right`}>Nilai</th>
            <th className={TH_CLS}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={TD_CLS}>Rata-rata Nilai Kuis</td>
            <td className={TD_RIGHT_CLS}>{fmtNumber(academic.avgScore)}/100</td>
            <td className={TD_CLS}>
              {academic.avgScore >= 75
                ? 'Baik'
                : academic.avgScore >= 60
                  ? 'Cukup'
                  : 'Perlu Perhatian'}
            </td>
          </tr>
          <tr>
            <td className={TD_CLS}>Tingkat Kelulusan Proyeksi</td>
            <td className={TD_RIGHT_CLS}>{fmtPercent(academic.projectedPassRate)}</td>
            <td className={TD_CLS}>
              {academic.projectedPassRate >= 80 ? 'Target Tercapai' : 'Perlu Peningkatan'}
            </td>
          </tr>
          <tr>
            <td className={TD_CLS}>Total Siswa Terdaftar</td>
            <td className={TD_RIGHT_CLS}>{fmtNumber(academic.totalStudents)}</td>
            <td className={TD_CLS}>—</td>
          </tr>
          <tr>
            <td className={TD_CLS}>Siswa Aktif (30 hari)</td>
            <td className={TD_RIGHT_CLS}>{fmtNumber(academic.activeStudents)}</td>
            <td className={TD_CLS}>
              {fmtPercent(
                academic.totalStudents > 0
                  ? (academic.activeStudents / academic.totalStudents) * 100
                  : 0
              )}{' '}
              adopsi
            </td>
          </tr>
          <tr>
            <td className={TD_CLS}>Siswa Butuh Perhatian</td>
            <td className={TD_RIGHT_CLS}>{fmtNumber(academic.atRiskStudents)}</td>
            <td className={TD_CLS}>
              {academic.atRiskStudents === 0 ? 'Semua Aktif' : 'Tidak Aktif 30+ Hari'}
            </td>
          </tr>
          <tr>
            <td className={TD_CLS}>Total Kursus Aktif</td>
            <td className={TD_RIGHT_CLS}>{fmtNumber(academic.totalCourses)}</td>
            <td className={TD_CLS}>—</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/* ─── Section: Adopsi Platform ─────────────────────────────── */

function AdoptionSection({ data }: { data: ExecutiveReportData }) {
  const { adoption } = data
  return (
    <section>
      <h2 className={SECTION_TITLE}>Adopsi Platform</h2>
      <table className={TABLE_CLS}>
        <thead>
          <tr>
            <th className={TH_CLS}>Indikator</th>
            <th className={`${TH_CLS} text-right`}>Persentase</th>
            <th className={TH_CLS}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={TD_CLS}>Tingkat Adopsi Siswa</td>
            <td className={TD_RIGHT_CLS}>{fmtPercent(adoption.studentAdoptionPct)}</td>
            <td className={TD_CLS}>Siswa aktif dalam 30 hari terakhir</td>
          </tr>
          <tr>
            <td className={TD_CLS}>Tingkat Adopsi Guru</td>
            <td className={TD_RIGHT_CLS}>{fmtPercent(adoption.teacherAdoptionPct)}</td>
            <td className={TD_CLS}>Guru aktif dalam 30 hari terakhir</td>
          </tr>
          <tr>
            <td className={TD_CLS}>Skor Adopsi Digital</td>
            <td className={TD_RIGHT_CLS}>{fmtNumber(adoption.adoptionScore)}/100</td>
            <td className={TD_CLS}>
              {adoption.adoptionScore >= 70
                ? 'Digital First'
                : adoption.adoptionScore >= 40
                  ? 'Berkembang'
                  : 'Perlu Dorongan'}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/* ─── Section: ROI ─────────────────────────────────────────── */

function ROISection({ data }: { data: ExecutiveReportData }) {
  const { roi } = data
  return (
    <section>
      <h2 className={SECTION_TITLE}>ROI & Estimasi Penghematan</h2>
      <table className={TABLE_CLS}>
        <thead>
          <tr>
            <th className={TH_CLS}>Kategori</th>
            <th className={`${TH_CLS} text-right`}>Estimasi</th>
            <th className={TH_CLS}>Dasar Perhitungan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={TD_CLS}>Lembar Kertas Dihemat</td>
            <td className={TD_RIGHT_CLS}>~{fmtNumber(roi.paperSavedSheets)} lembar</td>
            <td className={TD_CLS}>Kuis & pelajaran digital menggantikan cetak</td>
          </tr>
          <tr>
            <td className={TD_CLS}>Estimasi Penghematan Kertas</td>
            <td className={TD_RIGHT_CLS}>{fmtCurrency(roi.paperSavedCost)}</td>
            <td className={TD_CLS}>Per bulan (Rp500/lembar)</td>
          </tr>
          <tr>
            <td className={TD_CLS}>Efisiensi Waktu Guru</td>
            <td className={TD_RIGHT_CLS}>~{roi.teacherTimeSavedHours} jam/minggu</td>
            <td className={TD_CLS}>Dari penilaian tugas digital (10 menit/tugas)</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/* ─── Report Footer ────────────────────────────────────────── */

function ReportFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <footer className="mt-10 pt-4 border-t border-slate-300 text-xs text-slate-400 flex items-center justify-between">
      <span>Dibuat oleh EduSync LMS</span>
      <span>{fmtDateLong(generatedAt)}</span>
    </footer>
  )
}

/* ─── Loading / Error States ───────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <Spinner size="lg" />
      <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat laporan...</p>
    </div>
  )
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="text-4xl">⚠️</span>
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Gagal Memuat Laporan
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{message}</p>
      </div>
      <Button variant="secondary" onClick={onBack}>
        Kembali ke Dashboard
      </Button>
    </div>
  )
}

/* ─── Main ReportPreview Component ─────────────────────────── */

/**
 * Halaman preview laporan yang bisa di-print.
 * URL: /app/principal/report?type=monthly&month=4&year=2026
 */
export function ReportPreview() {
  const navigate = useNavigate()
  const { tenantId } = useAuth()

  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  // Parse query params
  const searchParams = new URLSearchParams(window.location.search)
  const reportType = (searchParams.get('type') ?? 'monthly') as ExecutiveReportData['reportType']
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10)

  const fetchReport = useCallback(async () => {
    if (!tenantId || fetchedRef.current) return
    fetchedRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      const token = readVilSession()?.access_token

      const response = await fetch(`${apiUrl}/api/v1/pdf/executive-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tenantId, reportType, month, year }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data?.reportData) {
        setReportData(data.reportData as ExecutiveReportData)
      } else {
        throw new Error('Data laporan tidak ditemukan')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, reportType, month, year])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  const handleBack = () => navigate('/app/principal')
  const handlePrint = () => exportToPDF()
  const handleDownloadCSV = () => {
    if (reportData) exportToCSV(reportData)
  }

  if (isLoading) return <LoadingState />
  if (error || !reportData) {
    return <ErrorState message={error ?? 'Data laporan tidak tersedia'} onBack={handleBack} />
  }

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-content {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 20mm 15mm 20mm 15mm;
          }
          table { page-break-inside: avoid; }
          section { page-break-inside: avoid; }
          h2 { page-break-after: avoid; }
        }
      `}</style>

      {/* ── Action Bar (not printed) ── */}
      <div className="no-print sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            ← Kembali
          </Button>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Preview Laporan
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reportData.schoolName} — {reportData.period}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownloadCSV} icon={<span>📊</span>}>
            Unduh CSV
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} icon={<span>🖨️</span>}>
            Cetak / PDF
          </Button>
        </div>
      </div>

      {/* ── Report Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div
          className="print-content bg-white text-slate-900 p-8 sm:p-12 shadow-lg rounded-2xl dark:shadow-none dark:bg-white dark:text-slate-900"
          id="report-print-area"
        >
          <ReportHeader data={reportData} />
          <ExecutiveSummarySection data={reportData} />
          <ActivityTrendSection data={reportData} />
          <AcademicSection data={reportData} />
          <AdoptionSection data={reportData} />
          <ROISection data={reportData} />
          <ReportFooter generatedAt={reportData.generatedAt} />
        </div>
      </div>
    </>
  )
}
