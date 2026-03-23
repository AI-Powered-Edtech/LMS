import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { CalendarEvent } from '@/src/features/calendar/hooks/useCalendarQueries'
import { DAYS_OF_WEEK, getEventColor } from '@/src/features/calendar/utils/calendarUtils'
import { cn } from '@/src/utils/cn'

interface MonthViewProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onTodayClick: () => void
  onSelectDate: (date: Date) => void
}

export function MonthView({
  currentDate,
  selectedDate,
  events,
  onPrevMonth,
  onNextMonth,
  onTodayClick,
  onSelectDate,
}: MonthViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const blanks = Array.from({ length: firstDay }, (_, i) => i)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const getEventsForDate = (date: number) =>
    events.filter(
      (e) =>
        e.date.getDate() === date && e.date.getMonth() === month && e.date.getFullYear() === year
    )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onTodayClick}
            className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-400 font-bold text-sm"
          >
            Hari Ini
          </button>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center font-bold text-slate-400 dark:text-slate-500 text-sm py-2 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {blanks.map((blank) => (
          <div
            key={`blank-${blank}`}
            className="aspect-square p-2 border border-transparent rounded-2xl bg-slate-50/50 dark:bg-slate-900/30"
          />
        ))}
        {days.map((day) => {
          const dateEvents = getEventsForDate(day)
          const isSelected =
            selectedDate?.getDate() === day &&
            selectedDate?.getMonth() === month &&
            selectedDate?.getFullYear() === year
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear()

          return (
            <button
              key={day}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className={cn(
                'aspect-square p-2 border rounded-2xl flex flex-col items-center justify-start gap-1 transition-all relative group',
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                  : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                isToday && !isSelected && 'border-blue-200 bg-blue-50/30 dark:bg-blue-900/10'
              )}
            >
              <span
                className={cn(
                  'text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mt-1',
                  isSelected ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300',
                  isToday && !isSelected && 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
                )}
              >
                {day}
              </span>
              <div className="flex flex-col gap-1 mt-1 w-full px-1">
                {dateEvents.slice(0, 2).map((e, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded truncate w-full text-left',
                      e.completed
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 line-through'
                        : getEventColor(e.type).replace('border-', 'bg-opacity-20 ')
                    )}
                  >
                    {e.title}
                  </div>
                ))}
                {dateEvents.length > 2 && (
                  <div className="text-[10px] font-bold text-slate-400 text-center">
                    +{dateEvents.length - 2} lagi
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
