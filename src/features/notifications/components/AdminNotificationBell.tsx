/**
 * AdminNotificationBell — Bell icon + dropdown panel for admin-specific notifications.
 *
 * Displays real-time notifications for admin event types:
 *   invitation_accepted, moderation_report, sync_failure, system_alert, user_joined
 */

import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Flag,
  Inbox,
  RefreshCw,
  Settings,
  UserCheck,
  UserPlus,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState, SkeletonCard } from '@/components/ui'
import { cn } from '@/utils/cn'

import { useAdminNotifications } from '../hooks/useAdminNotifications'
import type { AdminNotificationType, Notification } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAdminTypeIcon(type: string) {
  const cls = 'w-4 h-4 flex-shrink-0'
  switch (type as AdminNotificationType) {
    case 'invitation_accepted':
      return <UserCheck className={cn(cls, 'text-green-500')} />
    case 'moderation_report':
      return <Flag className={cn(cls, 'text-red-500')} />
    case 'sync_failure':
      return <RefreshCw className={cn(cls, 'text-orange-500')} />
    case 'system_alert':
      return <AlertTriangle className={cn(cls, 'text-yellow-500')} />
    case 'user_joined':
      return <UserPlus className={cn(cls, 'text-primary-500')} />
    default:
      return <Zap className={cn(cls, 'text-neutral-500')} />
  }
}

function getAdminTypeLabel(type: string): string {
  switch (type as AdminNotificationType) {
    case 'invitation_accepted':
      return 'Undangan Diterima'
    case 'moderation_report':
      return 'Laporan Moderasi'
    case 'sync_failure':
      return 'Gagal Sinkronisasi'
    case 'system_alert':
      return 'Peringatan Sistem'
    case 'user_joined':
      return 'Pengguna Baru'
    default:
      return 'Notifikasi'
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

function resolveAdminUrl(notification: Notification): string | null {
  if (notification.link) return notification.link
  switch (notification.type as AdminNotificationType) {
    case 'invitation_accepted':
      return '/app/admin/users'
    case 'moderation_report':
      return '/app/admin/moderation'
    case 'sync_failure':
      return '/app/admin/system-health'
    case 'system_alert':
      return '/app/admin/system-health'
    case 'user_joined':
      return '/app/admin/users'
    default:
      return null
  }
}

// ─── Notification Item ────────────────────────────────────────────────────────

interface AdminNotificationItemProps {
  notification: Notification
  markAsRead: (id: string) => void
  onClose: () => void
}

const AdminNotificationItem = memo(function AdminNotificationItem({
  notification,
  markAsRead,
  onClose,
}: AdminNotificationItemProps) {
  const navigate = useNavigate()
  const url = resolveAdminUrl(notification)

  const handleClick = useCallback(() => {
    if (!notification.is_read) markAsRead(notification.id)
    if (url) {
      onClose()
      void navigate(url)
    }
  }, [notification.is_read, notification.id, markAsRead, url, onClose, navigate])

  const readStatus = notification.is_read ? 'sudah dibaca' : 'belum dibaca'
  const ariaLabel = `${notification.title}, ${readStatus}${url ? ', klik untuk buka' : ''}`
  const typeLabel = getAdminTypeLabel(notification.type)

  return (
    <div
      role="listitem"
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors',
        !notification.is_read && 'bg-primary-50/40 dark:bg-primary-900/10'
      )}
    >
      {/* Unread dot */}
      <div className="mt-1 flex-shrink-0 w-2" aria-hidden="true">
        {!notification.is_read && <span className="block w-2 h-2 rounded-full bg-primary-500" />}
      </div>

      {/* Icon */}
      <div className="mt-0.5" aria-hidden="true">
        {getAdminTypeIcon(notification.type)}
      </div>

      {/* Content */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={handleClick}
        className={cn(
          'flex-1 min-w-0 text-left cursor-pointer',
          'hover:bg-transparent focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-primary-500 focus-visible:ring-offset-1 rounded'
        )}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {typeLabel}
          </span>
        </div>
        <p
          className={cn(
            'text-sm leading-snug truncate',
            notification.is_read
              ? 'text-neutral-600 dark:text-neutral-400'
              : 'font-semibold text-neutral-900 dark:text-neutral-100'
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
          {relativeTime(notification.created_at)}
        </p>
      </button>
    </div>
  )
})

// ─── Panel ────────────────────────────────────────────────────────────────────

interface AdminNotificationPanelProps {
  onClose: () => void
}

const AdminNotificationPanel = memo(function AdminNotificationPanel({
  onClose,
}: AdminNotificationPanelProps) {
  const { notifications, unreadCount, isLoading, isError, error, markAsRead, markAllAsRead } =
    useAdminNotifications()

  const recent = notifications.slice(0, 10)

  return (
    <div
      aria-label="Panel notifikasi admin"
      aria-live="polite"
      aria-atomic="false"
      className="w-80 sm:w-96 bg-neutral-50 dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-50 dark:bg-neutral-900 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className="font-bold text-neutral-900 dark:text-neutral-100 text-sm"
              id="admin-notification-panel-title"
            >
              Notifikasi Admin
            </h3>
            <CheckCircle className="w-3.5 h-3.5 text-primary-500" aria-hidden="true" />
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400" aria-live="off">
            {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              aria-label={`Tandai semua ${unreadCount} notifikasi sebagai sudah dibaca`}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
            >
              Tandai semua dibaca
            </button>
          )}
          <Link
            to="/settings"
            onClick={onClose}
            aria-label="Pengaturan notifikasi"
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors rounded"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Body */}
      <div
        role="list"
        aria-labelledby="admin-notification-panel-title"
        className="max-h-[420px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800"
      >
        {isLoading && recent.length === 0 ? (
          <div className="space-y-2 p-3" aria-label="Memuat notifikasi">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8" />}
            title="Gagal memuat notifikasi"
            description={error?.message || 'Terjadi kesalahan saat memuat notifikasi'}
          />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-8 h-8" />}
            title="Tidak ada notifikasi baru"
            description="Notifikasi sistem akan muncul di sini"
          />
        ) : (
          recent.map((n) => (
            <AdminNotificationItem
              key={n.id}
              notification={n}
              markAsRead={markAsRead}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {recent.length > 0 && (
        <div className="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-center">
          <Link
            to="/app/admin/system-health"
            onClick={onClose}
            className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            Lihat semua notifikasi admin
          </Link>
        </div>
      )}
    </div>
  )
})

// ─── Bell Button ──────────────────────────────────────────────────────────────

export function AdminNotificationBell() {
  const { unreadCount } = useAdminNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={
          unreadCount > 0 ? `Notifikasi admin (${unreadCount} belum dibaca)` : 'Notifikasi admin'
        }
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-danger-500 text-white text-[10px] font-bold leading-none"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50"
          >
            <AdminNotificationPanel onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
