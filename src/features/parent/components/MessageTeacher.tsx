// ==========================================================================
// MessageTeacher — Daftar Thread Percakapan Parent-Teacher
// Wave 4 — Task 29.5 (Mobile-first)
// ==========================================================================

import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'
import { getThreads, markThreadRead } from '../api/messageApi'
import type { MessageThread } from '../api/messageApi'

// ── Helpers ───────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} mnt lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay < 7) return `${diffDay} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Thread Item ───────────────────────────────────────────────────────────

function ThreadItem({ thread, onClick }: { thread: MessageThread; onClick: () => void }) {
  const hasUnread = thread.parent_unread_count > 0
  const teacherName = thread.teacher_name ?? 'Guru'
  const initials = getInitials(teacherName)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 text-left',
        'transition-colors duration-150',
        'active:bg-slate-100 dark:active:bg-slate-700/50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            'text-sm font-bold overflow-hidden',
            'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
          )}
        >
          {thread.teacher_avatar ? (
            <img
              src={thread.teacher_avatar}
              alt={teacherName}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        {hasUnread && (
          <div
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full
                       bg-blue-600 border-2 border-white dark:border-slate-900"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p
            className={cn(
              'text-sm truncate',
              hasUnread
                ? 'font-bold text-slate-900 dark:text-slate-100'
                : 'font-medium text-slate-700 dark:text-slate-300'
            )}
          >
            {teacherName}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
            {formatRelativeTime(thread.last_message_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {thread.subject ? (
            <p
              className={cn(
                'text-xs truncate flex-1',
                hasUnread
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              {thread.subject}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate flex-1 italic">
              Re: {thread.student_name ?? 'Siswa'}
            </p>
          )}
          {hasUnread && (
            <span
              className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full
                         bg-blue-600 text-white text-[10px] font-bold
                         flex items-center justify-center px-1"
            >
              {thread.parent_unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
      <span className="text-6xl" aria-hidden="true">
        💬
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
          Belum ada percakapan
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          Hubungi guru kelas untuk berdiskusi tentang perkembangan anak Anda
        </p>
      </div>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────────

function ThreadsSkeleton() {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function MessageTeacher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: threads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['parent', 'threads', user?.id ?? ''],
    queryFn: () => getThreads(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30_000, // Refresh setiap 30 detik
  })

  const { mutate: markRead } = useMutation({
    mutationFn: (threadId: string) => markThreadRead(threadId, 'parent'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'threads', user?.id ?? ''] })
    },
  })

  function handleThreadClick(thread: MessageThread) {
    if (thread.parent_unread_count > 0) {
      markRead(thread.id)
    }
    navigate(`/app/parent/pesan/${thread.id}`)
  }

  const totalUnread = (threads ?? []).reduce((sum, t) => sum + t.parent_unread_count, 0)

  return (
    <div className="-mx-4 -mt-4">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3
                   bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm
                   border-b border-slate-200/80 dark:border-slate-700/60"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Pesan</h1>
            {totalUnread > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {totalUnread} pesan belum dibaca
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="bg-white dark:bg-slate-800
                   rounded-2xl mx-4 mt-3
                   border border-slate-200 dark:border-slate-700
                   divide-y divide-slate-100 dark:divide-slate-700/50
                   overflow-hidden"
      >
        {isLoading ? (
          <ThreadsSkeleton />
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Gagal memuat pesan</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-blue-600 dark:text-blue-400 font-medium"
            >
              Coba lagi
            </button>
          </div>
        ) : !threads || threads.length === 0 ? (
          <EmptyState />
        ) : (
          threads.map((thread) => (
            <ThreadItem key={thread.id} thread={thread} onClick={() => handleThreadClick(thread)} />
          ))
        )}
      </div>
    </div>
  )
}
