import { AlertCircle, Bell } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'

import { EmptyState, Skeleton } from '@/src/components/ui'

import { useMarkAlertsRead, useStruggleAlerts } from '../queries/useStruggleQueries'
import { relativeTime } from '../utils/struggleHelpers'

interface Props {
  onClose: () => void
}

export function StruggleAlertPanel({ onClose }: Props) {
  const navigate = useNavigate()
  const { data: alerts = [], isLoading } = useStruggleAlerts({ limit: 30 })
  const markRead = useMarkAlertsRead()

  const unreadAlerts = alerts.filter((a) => !a.read_at)

  function handleMarkAllRead() {
    const ids = unreadAlerts.map((a) => a.alert_id)
    if (ids.length > 0) markRead.mutate(ids)
  }

  function handleAlertClick(courseId: string, lessonId: string, alertId: string) {
    // Mark this single alert as read
    if (!alerts.find((a) => a.alert_id === alertId)?.read_at) {
      markRead.mutate([alertId])
    }
    navigate(`/app/teacher/course-analytics?courseId=${courseId}&lessonId=${lessonId}`)
    onClose()
  }

  return (
    <div className="flex flex-col w-80 sm:w-96 max-h-[480px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
          Notifikasi Siswa
        </span>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadAlerts.length === 0 || markRead.isPending}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Tandai semua dibaca
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={<Bell className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
              title="Tidak ada notifikasi baru"
              description=""
            />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {alerts.map((alert) => {
              const isHigh = alert.severity === 'high'
              const isUnread = !alert.read_at
              return (
                <motion.button
                  key={alert.alert_id}
                  layout
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  onClick={() => handleAlertClick(alert.course_id, alert.lesson_id, alert.alert_id)}
                  className={[
                    'w-full text-left flex gap-3 px-4 py-3 border-l-4 transition-colors',
                    isHigh
                      ? 'border-l-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                      : 'border-l-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30',
                    isUnread ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900',
                  ].join(' ')}
                >
                  {/* Severity icon */}
                  <span className="shrink-0 mt-0.5 text-lg leading-none">
                    {isHigh ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {alert.student_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {alert.lesson_title} &middot; {alert.course_title}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {relativeTime(alert.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {isUnread && (
                    <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                  )}
                </motion.button>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
