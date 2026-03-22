import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useState } from 'react'
import { Bell, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/src/contexts/AuthContext'
import { cn } from '@/src/utils/cn'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notificationKeys,
  NotificationPreferencesPanel,
} from '@/src/features/notifications'
import type { Notification, NotificationType } from '@/src/features/notifications'
import {
  Award,
  BookOpen,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  Zap,
  Inbox,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FilterTab = 'semua' | 'belum-dibaca' | NotificationType

const PAGE_SIZE = 20

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
    default:
      return <Zap className={cn(cls, 'text-slate-500')} />
  }
}

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

const TAB_LABELS: Record<FilterTab, string> = {
  semua: 'Semua',
  'belum-dibaca': 'Belum Dibaca',
  grade_posted: 'Nilai',
  grade: 'Nilai',
  assignment_due: 'Tugas',
  quiz_available: 'Kuis',
  announcement: 'Pengumuman',
  course_enrolled: 'Kursus',
  badge_earned: 'Lencana',
  discussion_reply: 'Diskusi',
  system: 'Sistem',
}

const FILTER_TABS: FilterTab[] = [
  'semua',
  'belum-dibaca',
  'announcement',
  'grade_posted',
  'assignment_due',
  'quiz_available',
  'badge_earned',
  'discussion_reply',
  'system',
]

// ─── Notification Row ─────────────────────────────────────────────────────────

interface RowProps {
  notification: Notification
  onMarkRead: (id: string) => void
}

function NotificationRow({ notification, onMarkRead }: RowProps) {
  const bodyText = notification.body ?? notification.message

  return (
    <div
      className={cn(
        'flex items-start gap-4 px-6 py-4 transition-colors',
        !notification.is_read
          ? 'bg-blue-50/50 dark:bg-blue-900/10'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      )}
    >
      {/* Unread indicator */}
      <div className="mt-1 w-2 flex-shrink-0">
        {!notification.is_read && <span className="block w-2 h-2 rounded-full bg-blue-500" />}
      </div>

      {/* Icon */}
      <div className="mt-0.5">{getTypeIcon(notification.type)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm',
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

      {/* Action */}
      {!notification.is_read && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Tandai dibaca
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Notifications() {
  usePageTitle('Notifications')
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<FilterTab>('semua')
  const [page, setPage] = useState(0)
  const [showPrefs, setShowPrefs] = useState(false)

  const offset = page * PAGE_SIZE

  const { data: allNotifications = [], isLoading } = useQuery({
    queryKey: notificationKeys.list(tenantId!, user!.id, offset),
    queryFn: () => fetchNotifications(user!.id, tenantId!, PAGE_SIZE, offset),
    enabled: !!tenantId && !!user,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all(tenantId!) })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all(tenantId!) })
    },
  })

  // Apply filter
  const filtered = allNotifications.filter((n) => {
    if (activeTab === 'semua') return true
    if (activeTab === 'belum-dibaca') return !n.is_read
    return n.type === activeTab
  })

  const unreadCount = allNotifications.filter((n) => !n.is_read).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifikasi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50"
          >
            {markAllMutation.isPending ? 'Memproses...' : 'Tandai semua sudah dibaca'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab)
              setPage(0)
            }}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Inbox className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada notifikasi baru
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Notifikasi terbaru akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && allNotifications.length === PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            >
              Sebelumnya
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500">Halaman {page + 1}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPrefs((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Pengaturan Notifikasi
          </span>
          {showPrefs ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showPrefs && (
          <div className="border-t border-slate-100 dark:border-slate-800">
            <NotificationPreferencesPanel />
          </div>
        )}
      </div>
    </div>
  )
}
