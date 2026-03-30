import { AlertTriangle, CheckCircle, Clock, FileText, RefreshCw, XCircle } from 'lucide-react'

import { Badge, Button, EmptyState, Tabs } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'

import type { ContentType, Report, ReportReason, ReportStatus } from '../api/moderationService'
import { useModerationDashboard } from '../hooks/useModerationDashboard'
import { ModerationSkeleton } from './ModerationSkeleton'

// ─── Label Maps ────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<ReportReason, string> = {
  ai_generated: 'Konten AI',
  inappropriate: 'Tidak Pantas',
  spam: 'Spam',
  harassment: 'Pelecehan',
  other: 'Lainnya',
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post: 'Postingan',
  comment: 'Komentar',
  assignment: 'Tugas',
  user: 'Pengguna',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(timestamp: string): string {
  const now = Date.now()
  const diff = Math.floor((now - new Date(timestamp).getTime()) / 1000)

  if (diff < 60) return `${diff} detik lalu`
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}

function truncate(text: string, max = 100): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ─── Badge Helpers ─────────────────────────────────────────────────────────────

function contentTypeBadgeVariant(type: ContentType): 'info' | 'warning' | 'neutral' | 'danger' {
  switch (type) {
    case 'post':
      return 'info'
    case 'comment':
      return 'neutral'
    case 'assignment':
      return 'warning'
    case 'user':
      return 'danger'
  }
}

function statusBadgeVariant(status: ReportStatus): 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
  }
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

// ─── Row Component ─────────────────────────────────────────────────────────────

interface ReportRowProps {
  report: Report
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isResolving: boolean
}

function ReportRow({ report, onApprove, onReject, isResolving }: ReportRowProps) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
      {/* Jenis Konten */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant={contentTypeBadgeVariant(report.contentType)}>
          {CONTENT_TYPE_LABELS[report.contentType]}
        </Badge>
      </td>

      {/* Alasan */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant="neutral">{REASON_LABELS[report.reason]}</Badge>
      </td>

      {/* Dilaporkan oleh + waktu */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {report.reporterName}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {timeAgo(report.timestamp)}
        </p>
      </td>

      {/* Cuplikan konten */}
      <td className="px-4 py-3 max-w-[240px]">
        {report.contentSnippet ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
            &ldquo;{truncate(report.contentSnippet)}&rdquo;
          </p>
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant={statusBadgeVariant(report.status)}>{STATUS_LABELS[report.status]}</Badge>
      </td>

      {/* Aksi */}
      <td className="px-4 py-3 whitespace-nowrap">
        {report.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={isResolving}
              icon={<CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
              onClick={() => onApprove(report.id)}
              className="text-emerald-700 dark:text-emerald-400"
            >
              Setujui
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isResolving}
              icon={<XCircle className="h-3.5 w-3.5" />}
              onClick={() => onReject(report.id)}
            >
              Tolak
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>
    </tr>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function ModerationDashboard() {
  const { role } = useAuth()
  const {
    reports,
    allReports,
    isLoading,
    error,
    refetch,
    activeFilter,
    setActiveFilter,
    resolveReport,
  } = useModerationDashboard()

  const pendingCount = allReports?.filter((r) => r.status === 'pending').length ?? 0
  const approvedCount = allReports?.filter((r) => r.status === 'approved').length ?? 0
  const rejectedCount = allReports?.filter((r) => r.status === 'rejected').length ?? 0

  const tabs = [
    { id: 'all', label: 'Semua', count: allReports?.length ?? 0 },
    { id: 'pending', label: 'Menunggu', count: pendingCount },
    { id: 'approved', label: 'Disetujui', count: approvedCount },
    { id: 'rejected', label: 'Ditolak', count: rejectedCount },
  ]

  function handleApprove(reportId: string) {
    resolveReport.mutate({ reportId, status: 'approved' })
  }

  function handleReject(reportId: string) {
    resolveReport.mutate({ reportId, status: 'rejected' })
  }

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Halaman ini hanya dapat diakses oleh admin.
        </p>
      </div>
    )
  }

  if (isLoading) return <ModerationSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Gagal memuat laporan moderasi.</p>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={() => refetch()}
        >
          Coba Lagi
        </Button>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Moderasi Konten</h1>
          {pendingCount > 0 && (
            <Badge variant="warning" icon={<Clock className="h-3 w-3" />}>
              {pendingCount} menunggu
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={() => refetch()}
        >
          Muat Ulang
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeFilter}
        onChange={(id) => setActiveFilter(id as ReportStatus | 'all')}
      />

      {/* Tabel Laporan */}
      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Tidak ada laporan"
          description={
            activeFilter === 'all'
              ? 'Belum ada laporan yang masuk.'
              : `Tidak ada laporan dengan status "${STATUS_LABELS[activeFilter as ReportStatus] ?? activeFilter}".`
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Daftar laporan moderasi">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    Jenis Konten
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    Alasan
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    Dilaporkan Oleh
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Cuplikan Konten
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isResolving={resolveReport.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
