import { CheckCircle2, Clock, HelpCircle, Play } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { LessonTimelineEvent } from '../types'

interface LessonTimelineProps {
  events: LessonTimelineEvent[]
  maxItems?: number
}

export function LessonTimeline({ events, maxItems = 20 }: LessonTimelineProps) {
  const displayEvents = events.slice(0, maxItems)

  const getEventIcon = (eventType: LessonTimelineEvent['eventType']) => {
    switch (eventType) {
      case 'started':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'stuck':
        return <HelpCircle className="w-4 h-4 text-red-500" />
      case 'helped':
        return <Clock className="w-4 h-4 text-purple-500" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  const getEventColor = (eventType: LessonTimelineEvent['eventType']) => {
    switch (eventType) {
      case 'started':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
      case 'completed':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      case 'stuck':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      case 'helped':
        return 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20'
      default:
        return 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
    }
  }

  const getEventLabel = (eventType: LessonTimelineEvent['eventType']) => {
    switch (eventType) {
      case 'started':
        return 'Mulai'
      case 'completed':
        return 'Selesai'
      case 'stuck':
        return 'Macet'
      case 'helped':
        return 'Dibantu'
      default:
        return eventType
    }
  }

  if (displayEvents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          Timeline Aktivitas
        </h3>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Belum ada aktivitas terbaru</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
        Timeline Aktivitas
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Aktivitas siswa terkini</p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {displayEvents.map((event) => (
          <div
            key={event.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border transition-colors',
              getEventColor(event.eventType)
            )}
          >
            <div className="flex-shrink-0 mt-0.5">{getEventIcon(event.eventType)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {event.studentName}
                </span>
                <span className="px-2 py-0.5 bg-white/60 dark:bg-slate-700/60 rounded text-xs font-bold text-slate-700 dark:text-slate-300">
                  {getEventLabel(event.eventType)}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{event.lessonTitle}</p>

              {event.details && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">{event.details}</p>
              )}

              <p className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(event.timestamp).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {events.length > maxItems && (
        <div className="text-center mt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan {maxItems} dari {events.length} aktivitas
          </p>
        </div>
      )}
    </div>
  )
}
