import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  AlertCircle,
  BookOpen,
  CheckSquare,
  ClipboardList,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import { memo, useCallback } from 'react'

import { Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

import {
  type TeacherActivityEvent,
  type TeacherActivityEventType,
  useTeacherActivity,
} from '../hooks/useTeacherActivity'

// ─── Helpers ──────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

function getStudentName(event: TeacherActivityEvent): string {
  return event.profiles?.full_name ?? 'Siswa'
}

function getEventLabel(event: TeacherActivityEvent): {
  prefix: string
  bold: string
  suffix: string
} {
  const meta = event.metadata ?? {}
  const type = event.event_type as TeacherActivityEventType

  switch (type) {
    case 'LESSON_COMPLETED': {
      const title = (meta.lesson_title as string) ?? (meta.title as string) ?? 'pelajaran'
      return { prefix: 'menyelesaikan pelajaran', bold: title, suffix: '' }
    }
    case 'QUIZ_COMPLETED': {
      const title = (meta.quiz_title as string) ?? (meta.title as string) ?? 'kuis'
      const score = meta.score != null ? String(meta.score) : null
      const maxScore = meta.max_score != null ? String(meta.max_score) : null
      const scorePart =
        score != null ? ` dengan nilai ${score}${maxScore ? `/${maxScore}` : ''}` : ''
      return { prefix: 'menyelesaikan kuis', bold: title, suffix: scorePart }
    }
    case 'ASSIGNMENT_SUBMITTED': {
      const title = (meta.assignment_title as string) ?? (meta.title as string) ?? 'tugas'
      return { prefix: 'mengumpulkan tugas', bold: title, suffix: '' }
    }
    case 'CLASS_JOINED': {
      const title = (meta.class_name as string) ?? (meta.title as string) ?? 'kelas'
      return { prefix: 'bergabung ke kelas', bold: title, suffix: '' }
    }
    default:
      return { prefix: 'melakukan aktivitas', bold: '', suffix: '' }
  }
}

function getEventIcon(eventType: TeacherActivityEventType) {
  const baseClass = 'w-4 h-4 shrink-0'
  switch (eventType) {
    case 'LESSON_COMPLETED':
      return <BookOpen className={cn(baseClass, 'text-blue-500')} />
    case 'QUIZ_COMPLETED':
      return <CheckSquare className={cn(baseClass, 'text-green-500')} />
    case 'ASSIGNMENT_SUBMITTED':
      return <ClipboardList className={cn(baseClass, 'text-orange-500')} />
    case 'CLASS_JOINED':
      return <UserPlus className={cn(baseClass, 'text-purple-500')} />
    default:
      return <BookOpen className={cn(baseClass, 'text-neutral-400')} />
  }
}

function getEventIconBg(eventType: TeacherActivityEventType): string {
  switch (eventType) {
    case 'LESSON_COMPLETED':
      return 'bg-blue-50 dark:bg-blue-900/20'
    case 'QUIZ_COMPLETED':
      return 'bg-green-50 dark:bg-green-900/20'
    case 'ASSIGNMENT_SUBMITTED':
      return 'bg-orange-50 dark:bg-orange-900/20'
    case 'CLASS_JOINED':
      return 'bg-purple-50 dark:bg-purple-900/20'
    default:
      return 'bg-neutral-100 dark:bg-neutral-800'
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: localeId })
  } catch {
    return ''
  }
}

// ─── Sub-components ────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

const ActivityItem = memo(function ActivityItem({ event }: { event: TeacherActivityEvent }) {
  const name = getStudentName(event)
  const { prefix, bold, suffix } = getEventLabel(event)
  const icon = getEventIcon(event.event_type)
  const iconBg = getEventIconBg(event.event_type)
  const relTime = formatRelativeTime(event.created_at)
  const initials = getInitials(event.profiles?.full_name)

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      {/* Avatar */}
      <div className="shrink-0 relative">
        {event.profiles?.avatar_url ? (
          <img
            src={event.profiles.avatar_url}
            alt={name}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            {initials}
          </div>
        )}
        {/* Event type icon badge */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-neutral-900',
            iconBg
          )}
        >
          {icon}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
          <span className="font-semibold text-neutral-900 dark:text-white">{name}</span> {prefix}{' '}
          {bold && (
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{bold}</span>
          )}
          {suffix}
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{relTime}</p>
      </div>
    </div>
  )
})

// ─── Main Component ────────────────────────────────────────────

export function TeacherActivityFeed() {
  const { data: events, isLoading, isError, isFetching, refetch } = useTeacherActivity()

  const handleRefetch = useCallback(() => refetch(), [refetch])

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Aktivitas Terbaru
          </h2>
          {/* Subtle pulse indicator saat sedang refetching */}
          {isFetching && !isLoading && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />}
          onClick={handleRefetch}
          disabled={isFetching}
          aria-label="Perbarui aktivitas"
        >
          Perbarui
        </Button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <ActivitySkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Gagal memuat aktivitas. Coba lagi.
            </p>
            <Button variant="secondary" size="sm" onClick={handleRefetch}>
              Coba Lagi
            </Button>
          </div>
        ) : events && events.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {events.map((event) => (
              <ActivityItem key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
            <BookOpen className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Belum ada aktivitas terbaru.
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Aktivitas siswa akan muncul di sini.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
