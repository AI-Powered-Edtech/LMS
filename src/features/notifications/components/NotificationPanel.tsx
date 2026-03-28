import {
  Award,
  Bell,
  BookOpen,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Inbox,
  MessageSquare,
  Settings,
  Zap,
} from 'lucide-react'
import { memo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { cn } from '@/src/utils/cn'

import { useNotifications } from '../hooks/useNotifications'
import type { Notification, NotificationType } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeIcon(type: NotificationType) {
  const cls = 'w-4 h-4 flex-shrink-0'
  switch (type) {
    case 'badge_earned':
      return <Award className={cn(cls, 'text-yellow-500')} />
    case 'announcement':
      return <Bell className={cn(cls, 'text-blue-500')} />
    case 'grade_posted':
    case 'grade':
      return <CheckCircle className={cn(cls, 'text-green-500')} />
    case 'quiz_available':
      return <ClipboardList className={cn(cls, 'text-purple-500')} />
    case 'assignment_due':
      return <BookOpen className={cn(cls, 'text-orange-500')} />
    case 'course_enrolled':
      return <GraduationCap className={cn(cls, 'text-indigo-500')} />
    case 'discussion_reply':
      return <MessageSquare className={cn(cls, 'text-teal-500')} />
    case 'system':
      return <Zap className={cn(cls, 'text-slate-500')} />
    default:
      return <Bell className={cn(cls, 'text-slate-400')} />
  }
}

/** Relative time in Bahasa Indonesia */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}

function resolveUrl(notification: Notification): string | null {
  if (notification.link) return notification.link
  switch (notification.type) {
    case 'grade_posted':
    case 'grade':
      return '/app/student/grades'
    case 'assignment_due':
      return '/assignments'
    case 'quiz_available':
      return '/app/student/quizzes'
    case 'announcement':
      return '/announcements'
    case 'course_enrolled':
      return '/app/student/courses'
    case 'badge_earned':
      return '/app/student/gamification'
    case 'discussion_reply':
      return '/forum'
    default:
      return null
  }
}

// ─── Notification Item ────────────────────────────────────────────────────────

// ⚡ Perf: Changed interface from `onRead: () => void` to `markRead: (id) => void`.
// Previously the parent passed `onRead={() => markRead(n.id)}` — a new arrow function
// per notification per render — which defeated the React.memo on NotificationItem.
// Now the stable `markRead` reference is passed once, and the child calls it with
// its own notification ID internally.
interface NotificationItemProps {
  notification: Notification
  markRead: (id: string) => void
  onClose: () => void
}

const NotificationItem = memo(function NotificationItem({
  notification,
  markRead,
  onClose,
}: NotificationItemProps) {
  const navigate = useNavigate()
  const url = resolveUrl(notification)
  const bodyText = notification.message

  const handleClick = useCallback(() => {
    if (!notification.is_read) markRead(notification.id)
    if (url) {
      onClose()
      navigate(url)
    }
  }, [notification.is_read, notification.id, markRead, url, onClose, navigate])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        'hover:bg-slate-50 dark:hover:bg-slate-800/60',
        !notification.is_read && 'bg-blue-50/40 dark:bg-blue-900/10'
      )}
    >
      {/* Unread dot */}
      <div className="mt-1 flex-shrink-0 w-2">
        {!notification.is_read && <span className="block w-2 h-2 rounded-full bg-blue-500" />}
      </div>

      {/* Icon */}
      <div className="mt-0.5">{getTypeIcon(notification.type)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug truncate',
            notification.is_read
              ? 'text-slate-600 dark:text-slate-400'
              : 'font-semibold text-slate-900 dark:text-slate-100'
          )}
        >
          {notification.title}
        </p>
        {bodyText && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {bodyText}
          </p>
        )}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {relativeTime(notification.created_at)}
        </p>
      </div>
    </div>
  )
})

// ─── Panel ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  onClose: () => void
}

export const NotificationPanel = memo(function NotificationPanel({
  onClose,
}: NotificationPanelProps) {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications()

  const recent = notifications.slice(0, 10)

  return (
    <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Notifikasi</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Tandai semua sudah dibaca
            </button>
          )}
          <Link
            to="/settings"
            onClick={onClose}
            aria-label="Pengaturan notifikasi"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading && recent.length === 0 ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tidak ada notifikasi baru
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Notifikasi terbaru akan muncul di sini.
            </p>
          </div>
        ) : (
          recent.map((n) => (
            <NotificationItem key={n.id} notification={n} markRead={markRead} onClose={onClose} />
          ))
        )}
      </div>

      {/* Footer */}
      {recent.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
          <Link
            to="/notifications"
            onClick={onClose}
            className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Lihat semua notifikasi
          </Link>
        </div>
      )}
    </div>
  )
})
