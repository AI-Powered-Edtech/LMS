import { AlertCircle, Bell, BookOpen, Settings2, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card, EmptyState, Skeleton } from '@/src/components/ui'
import { StruggleConfigPanel } from '@/src/features/struggle/components/StruggleConfigPanel'
import {
  useMarkAlertsRead,
  useStruggleAlerts,
} from '@/src/features/struggle/queries/useStruggleQueries'
import { relativeTime } from '@/src/features/struggle/utils/struggleHelpers'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useRoleBasedPath } from '@/src/hooks/useRoleBasedPath'

// ─────────────────────────────────────────────────────────────────────────────
// Severity badge
// ─────────────────────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: 'medium' | 'high' }) {
  if (severity === 'high') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle className="w-3 h-3" />
        Darurat
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <AlertCircle className="w-3 h-3" />
      Perhatian
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Alert list skeleton
// ─────────────────────────────────────────────────────────────────────────────
function AlertListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat data siswa...">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export function StruggleDashboard() {
  usePageTitle('Deteksi Kesulitan Belajar')
  const navigate = useNavigate()
  const getPath = useRoleBasedPath()

  const [showConfig, setShowConfig] = useState(false)
  const [filterUnread, setFilterUnread] = useState(false)

  const { data: alerts = [], isLoading } = useStruggleAlerts({
    unreadOnly: filterUnread,
    limit: 50,
  })
  const markRead = useMarkAlertsRead()

  const unreadCount = alerts.filter((a) => !a.read_at).length
  const highCount = alerts.filter((a) => a.severity === 'high').length

  function handleMarkAllRead() {
    const ids = alerts.filter((a) => !a.read_at).map((a) => a.alert_id)
    if (ids.length > 0) markRead.mutate(ids)
  }

  function handleAlertClick(courseId: string, lessonId: string, alertId: string) {
    if (!alerts.find((a) => a.alert_id === alertId)?.read_at) {
      markRead.mutate([alertId])
    }
    navigate(
      `${getPath('/app/teacher/course-analytics', '/app/admin/course-analytics')}?courseId=${courseId}&lessonId=${lessonId}`
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Page Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-500" aria-hidden="true" />
              Deteksi Kesulitan Belajar
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pantau siswa yang membutuhkan bantuan ekstra berdasarkan sinyal belajar mereka.
            </p>
          </div>

          <button
            onClick={() => setShowConfig((v) => !v)}
            aria-expanded={showConfig}
            aria-controls="config-panel"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm shrink-0"
          >
            <Settings2 className="w-4 h-4" aria-hidden="true" />
            Konfigurasi Deteksi
          </button>
        </header>

        {/* ── Stats row ── */}
        <section aria-label="Ringkasan status" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-4 p-4">
            <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {isLoading ? '—' : alerts.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Total alert aktif
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-4">
            <span className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {isLoading ? '—' : highCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Status darurat
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-4">
            <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {isLoading ? '—' : unreadCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Belum dibaca</p>
            </div>
          </Card>
        </section>

        {/* ── Config panel (collapsible) ── */}
        {showConfig && (
          <section id="config-panel" aria-label="Konfigurasi deteksi kesulitan">
            <StruggleConfigPanel />
          </section>
        )}

        {/* ── Alert list ── */}
        <section aria-label="Daftar siswa kesulitan belajar">
          <Card className="overflow-hidden">
            {/* Card header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Siswa Perlu Perhatian
              </h2>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Unread filter toggle */}
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterUnread}
                    onChange={(e) => setFilterUnread(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                    aria-label="Tampilkan hanya yang belum dibaca"
                  />
                  Belum dibaca saja
                </label>

                <button
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0 || markRead.isPending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {markRead.isPending ? 'Memproses...' : 'Tandai semua dibaca'}
                </button>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5">
              {isLoading ? (
                <AlertListSkeleton />
              ) : alerts.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={
                      <BookOpen
                        className="w-10 h-10 text-slate-300 dark:text-slate-600"
                        aria-hidden="true"
                      />
                    }
                    title="Tidak ada siswa yang kesulitan"
                    description={
                      filterUnread
                        ? 'Semua alert sudah dibaca. Hapus filter untuk melihat riwayat lengkap.'
                        : 'Semua siswa tampak belajar dengan baik saat ini.'
                    }
                  />
                </div>
              ) : (
                <ul role="list" aria-label="Daftar alert siswa kesulitan" className="space-y-2">
                  {alerts.map((alert) => {
                    const isUnread = !alert.read_at
                    const isHigh = alert.severity === 'high'
                    return (
                      <li key={alert.alert_id}>
                        <button
                          onClick={() =>
                            handleAlertClick(alert.course_id, alert.lesson_id, alert.alert_id)
                          }
                          aria-label={`Lihat detail ${alert.student_name} — ${alert.lesson_title}`}
                          className={[
                            'w-full text-left flex items-start gap-4 p-4 rounded-xl border-l-4 transition-all group',
                            isHigh
                              ? 'border-l-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'
                              : 'border-l-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20',
                            isUnread
                              ? 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 border-l-4'
                              : 'bg-white dark:bg-slate-900 border border-transparent',
                          ].join(' ')}
                        >
                          {/* Avatar initials */}
                          <span
                            aria-hidden="true"
                            className={[
                              'shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                              isHigh
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                            ].join(' ')}
                          >
                            {alert.student_name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </span>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                {alert.student_name}
                              </span>
                              {isUnread && (
                                <span
                                  aria-label="Belum dibaca"
                                  className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0"
                                />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {alert.lesson_title}
                              <span className="mx-1 opacity-50">·</span>
                              {alert.course_title}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              Skor kesulitan:{' '}
                              <span className="font-semibold">{alert.struggle_score}</span>
                              <span className="mx-1 opacity-50">·</span>
                              {relativeTime(alert.created_at)}
                            </p>
                          </div>

                          {/* Severity badge */}
                          <div className="shrink-0">
                            <SeverityBadge severity={alert.severity} />
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Card>
        </section>
      </div>
    </main>
  )
}
