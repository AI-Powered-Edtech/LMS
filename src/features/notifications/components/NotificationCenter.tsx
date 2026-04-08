/**
 * NotificationCenter — Full-featured notification panel with two tabs:
 *   1. "Notifikasi" — grouped list with date headers, mark read, delete actions
 *   2. "Pengaturan" — NotificationPreferencesPanel (per-type × per-channel)
 *
 * Features:
 * - Date grouping: Hari Ini / Kemarin / Minggu Lalu / Lebih Lama
 * - Mark single / all as read
 * - Unread badge on bell icon
 * - Full dark mode
 * - Keyboard navigation & screen reader support
 * - Empty state for no notifications
 */

import {
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ClipboardList,
  Flag,
  GraduationCap,
  Inbox,
  MessageSquare,
  RefreshCw,
  Settings,
  Smartphone,
  UserCheck,
  UserPlus,
  Zap,
} from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { EmptyState, SkeletonCard } from '@/components/ui'
import { cn } from '@/utils/cn'

import { useNotifications } from '../hooks/useNotifications'
import type { Notification, NotificationType } from '../types'
import { type DateGroup, getDateGroup, relativeTime } from '../utils/notificationFormatter'
import { NotificationPreferencesPanel } from './NotificationPreferencesPanel'

// ─── Tab type ─────────────────────────────────────────────────────────────────

type CenterTab = 'notifications' | 'settings'

// ─── Icon helper ──────────────────────────────────────────────────────────────

function getTypeIcon(type: NotificationType) {
  const cls = 'w-4 h-4 flex-shrink-0'
  switch (type) {
    case 'badge_earned':
      return <Award className={cn(cls, 'text-yellow-500')} />
    case 'announcement':
      return <Bell className={cn(cls, 'text-blue-500')} />
    case 'grade_posted':
    case 'grade':
      return <Check className={cn(cls, 'text-green-500')} />
    case 'quiz_available':
    case 'quiz_result':
      return <ClipboardList className={cn(cls, 'text-purple-500')} />
    case 'assignment_due':
      return <BookOpen className={cn(cls, 'text-orange-500')} />
    case 'course_enrolled':
      return <GraduationCap className={cn(cls, 'text-indigo-500')} />
    case 'discussion_reply':
      return <MessageSquare className={cn(cls, 'text-teal-500')} />
    case 'message_received':
      return <Smartphone className={cn(cls, 'text-cyan-500')} />
    case 'system':
      return <Zap className={cn(cls, 'text-slate-500')} />
    case 'system_alert':
      return <AlertTriangle className={cn(cls, 'text-yellow-500')} />
    case 'invitation_accepted':
      return <UserCheck className={cn(cls, 'text-green-500')} />
    case 'moderation_report':
      return <Flag className={cn(cls, 'text-red-500')} />
    case 'sync_failure':
      return <RefreshCw className={cn(cls, 'text-orange-500')} />
    case 'user_joined':
      return <UserPlus className={cn(cls, 'text-blue-500')} />
    default:
      return <Bell className={cn(cls, 'text-slate-400')} />
  }
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
    case 'quiz_result':
      return '/app/student/quizzes'
    case 'announcement':
      return '/announcements'
    case 'course_enrolled':
      return '/app/student/courses'
    case 'badge_earned':
      return '/app/student/gamification'
    case 'discussion_reply':
      return '/forum'
    case 'invitation_accepted':
    case 'user_joined':
      return '/app/admin/users'
    case 'moderation_report':
      return '/app/admin/moderation'
    case 'sync_failure':
    case 'system_alert':
      return '/app/admin/system-health'
    default:
      return null
  }
}

// ─── Notification Item ────────────────────────────────────────────────────────

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

  const handleClick = useCallback(() => {
    if (!notification.is_read) markRead(notification.id)
    if (url) {
      onClose()
      void navigate(url)
    }
  }, [notification.is_read, notification.id, markRead, url, onClose, navigate])

  const handleMarkRead = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!notification.is_read) markRead(notification.id)
    },
    [notification.is_read, notification.id, markRead]
  )

  const readStatus = notification.is_read ? 'sudah dibaca' : 'belum dibaca'
  const ariaLabel = `${notification.title}, ${readStatus}${url ? ', klik untuk buka' : ''}`

  return (
    <div
      role="listitem"
      className={cn(
        'flex items-start gap-3 px-4 py-3 group transition-colors',
        !notification.is_read && 'bg-blue-50/40 dark:bg-blue-900/10'
      )}
    >
      {/* Unread indicator dot */}
      <div className="mt-1.5 flex-shrink-0 w-2" aria-hidden="true">
        {!notification.is_read && (
          <span className="block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        )}
      </div>

      {/* Type icon */}
      <div className="mt-0.5 flex-shrink-0" aria-hidden="true">
        {getTypeIcon(notification.type)}
      </div>

      {/* Content button */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={handleClick}
        className={cn(
          'flex-1 min-w-0 text-left',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded'
        )}
      >
        <p
          className={cn(
            'text-sm leading-snug',
            notification.is_read
              ? 'text-slate-600 dark:text-slate-400'
              : 'font-semibold text-slate-900 dark:text-slate-100'
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {relativeTime(notification.created_at)}
        </p>
      </button>

      {/* Mark read action (visible on hover / focus-within) */}
      {!notification.is_read && (
        <button
          type="button"
          onClick={handleMarkRead}
          aria-label={`Tandai "${notification.title}" sudah dibaca`}
          className={cn(
            'flex-shrink-0 p-1 rounded transition-colors',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
            'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400',
            'focus:outline-none focus:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
})

// ─── Date Group Header ────────────────────────────────────────────────────────

function DateGroupHeader({ label }: { label: DateGroup }) {
  return (
    <div className="sticky top-0 px-4 py-1.5 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm z-10">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
    </div>
  )
}

// ─── Grouped notification list ────────────────────────────────────────────────

const DATE_GROUP_ORDER: DateGroup[] = ['Hari Ini', 'Kemarin', 'Minggu Lalu', 'Lebih Lama']

interface GroupedListProps {
  notifications: Notification[]
  markRead: (id: string) => void
  onClose: () => void
}

function GroupedNotificationList({ notifications, markRead, onClose }: GroupedListProps) {
  const grouped = useMemo(() => {
    const map = new Map<DateGroup, Notification[]>()
    for (const n of notifications) {
      const group = getDateGroup(n.created_at)
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(n)
    }
    return map
  }, [notifications])

  return (
    <>
      {DATE_GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => (
        <div key={group}>
          <DateGroupHeader label={group} />
          {grouped.get(group)!.map((n) => (
            <NotificationItem key={n.id} notification={n} markRead={markRead} onClose={onClose} />
          ))}
        </div>
      ))}
    </>
  )
}

// ─── Main NotificationCenter ──────────────────────────────────────────────────

interface NotificationCenterProps {
  /** Active tab */
  activeTab: CenterTab
  /** Tab change callback */
  onTabChange: (tab: CenterTab) => void
  /** Close the center panel */
  onClose: () => void
}

export const NotificationCenter = memo(function NotificationCenter({
  activeTab,
  onTabChange,
  onClose,
}: NotificationCenterProps) {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications()

  // Show up to 30 most recent; grouped by date
  const recent = notifications.slice(0, 30)

  return (
    <div
      aria-label="Pusat notifikasi"
      aria-live="polite"
      aria-atomic="false"
      className="w-80 sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[560px]"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-20">
        <div>
          <h3
            id="notification-center-title"
            className="font-bold text-slate-900 dark:text-slate-100 text-sm"
          >
            Pusat Notifikasi
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400" aria-live="off">
            {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>

        {/* Mark all read + settings link */}
        {activeTab === 'notifications' && unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            aria-label={`Tandai semua ${unreadCount} notifikasi sebagai sudah dibaca`}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Tandai Semua
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Tab pusat notifikasi"
        className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900"
      >
        <button
          type="button"
          role="tab"
          id="tab-notifications"
          aria-selected={activeTab === 'notifications'}
          aria-controls="panel-notifications"
          onClick={() => onTabChange('notifications')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors',
            'border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
            activeTab === 'notifications'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          <Bell className="w-3.5 h-3.5" aria-hidden="true" />
          Notifikasi
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="ml-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold leading-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-settings"
          aria-selected={activeTab === 'settings'}
          aria-controls="panel-settings"
          onClick={() => onTabChange('settings')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors',
            'border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          <Settings className="w-3.5 h-3.5" aria-hidden="true" />
          Pengaturan
        </button>
      </div>

      {/* ── Tab Panels ─────────────────────────────────────────────────────── */}

      {/* Notifications tab */}
      <div
        id="panel-notifications"
        role="tabpanel"
        aria-labelledby="tab-notifications"
        hidden={activeTab !== 'notifications'}
        className="overflow-y-auto flex-1"
      >
        <div
          role="list"
          aria-labelledby="notification-center-title"
          className="divide-y divide-slate-100 dark:divide-slate-800"
        >
          {isLoading && recent.length === 0 ? (
            <div className="space-y-2 p-3" aria-label="Memuat notifikasi">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-8 h-8" />}
              title="Tidak ada notifikasi baru"
              description="Semua notifikasi akan muncul di sini"
            />
          ) : (
            <GroupedNotificationList notifications={recent} markRead={markRead} onClose={onClose} />
          )}
        </div>
      </div>

      {/* Settings tab */}
      <div
        id="panel-settings"
        role="tabpanel"
        aria-labelledby="tab-settings"
        hidden={activeTab !== 'settings'}
        className="overflow-y-auto flex-1"
      >
        <NotificationPreferencesPanel embedded />
      </div>
    </div>
  )
})
