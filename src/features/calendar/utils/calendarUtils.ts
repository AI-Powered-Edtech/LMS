import { AlertCircle } from 'lucide-react'
import { createElement } from 'react'

export type EventType = 'exam' | 'assignment' | 'event' | 'quiz'
export type Priority = 'low' | 'medium' | 'high'

export const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const

export function getEventColor(type: string): string {
  switch (type) {
    case 'exam':
      return 'bg-red-500 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    case 'assignment':
      return 'bg-orange-500 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    case 'quiz':
      return 'bg-blue-500 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'event':
      return 'bg-purple-500 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    default:
      return 'bg-slate-500 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
  }
}

/** Background color classes for calendar event labels (with dark mode) */
export function getEventBgColor(type: string): string {
  switch (type) {
    case 'exam':
      return 'bg-red-500/20 dark:bg-red-500/10'
    case 'assignment':
      return 'bg-orange-500/20 dark:bg-orange-500/10'
    case 'quiz':
      return 'bg-blue-500/20 dark:bg-blue-500/10'
    case 'event':
      return 'bg-purple-500/20 dark:bg-purple-500/10'
    default:
      return 'bg-slate-500/20 dark:bg-slate-500/10'
  }
}

export function getPriorityIcon(priority?: string): React.ReactNode {
  switch (priority) {
    case 'high':
      return createElement(AlertCircle, { className: 'w-4 h-4 text-red-500' })
    case 'medium':
      return createElement(AlertCircle, { className: 'w-4 h-4 text-orange-500' })
    case 'low':
      return createElement(AlertCircle, { className: 'w-4 h-4 text-blue-500' })
    default:
      return null
  }
}

/** Calculate countdown label for upcoming events */
export function getCountdown(eventDate: Date, today: Date): string | null {
  const diffTime = eventDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Besok'
  if (diffDays > 1 && diffDays <= 7) return `H-${diffDays}`
  return null
}
