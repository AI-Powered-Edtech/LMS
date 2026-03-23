import { Bell, CheckCircle2, Circle, Clock, MapPin, Paperclip, Video } from 'lucide-react'
import { motion } from 'motion/react'

import type { CalendarEvent } from '@/src/features/calendar/hooks/useCalendarQueries'
import {
  DAYS_OF_WEEK,
  getCountdown,
  getEventColor,
  getPriorityIcon,
} from '@/src/features/calendar/utils/calendarUtils'
import { cn } from '@/src/utils/cn'

interface AgendaViewProps {
  events: CalendarEvent[]
  today: Date
  onToggleCompletion: (id: string) => void
}

export function AgendaView({ events, today, onToggleCompletion }: AgendaViewProps) {
  const upcomingEvents = [...events]
    .filter((e) => e.date.getTime() >= today.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">
        Agenda Mendatang
      </h2>
      <div className="space-y-4">
        {upcomingEvents.map((event, index) => {
          const countdown = getCountdown(event.date, today)
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex gap-4 p-4 rounded-2xl border transition-all',
                event.completed
                  ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 opacity-75'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
              )}
            >
              <div className="flex flex-col items-center justify-center min-w-[60px] px-2 border-r border-slate-100 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  {DAYS_OF_WEEK[event.date.getDay()]}
                </span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                  {event.date.getDate()}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {event.date.toLocaleString('id-ID', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                          getEventColor(event.type).split(' ')[0],
                          'text-white'
                        )}
                      >
                        {event.type}
                      </span>
                      {countdown && !event.completed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          {countdown}
                        </span>
                      )}
                      {getPriorityIcon(event.priority)}
                    </div>
                    <h4
                      className={cn(
                        'font-bold text-lg truncate',
                        event.completed
                          ? 'text-slate-500 dark:text-slate-400 line-through'
                          : 'text-slate-900 dark:text-slate-100'
                      )}
                    >
                      {event.title}
                    </h4>
                  </div>
                  {(event.type === 'assignment' || event.type === 'exam') && (
                    <button
                      onClick={() => onToggleCompletion(event.id)}
                      className="shrink-0 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                      {event.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    {event.time} {event.endTime ? `- ${event.endTime}` : ''}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {event.location.includes('Zoom') ? (
                      <Video className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                    <span className="truncate max-w-[150px]">{event.location}</span>
                  </div>
                  {event.hasAttachment && (
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                      <Paperclip className="w-3 h-3" />
                      <span className="text-xs font-bold">Lampiran</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
