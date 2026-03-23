import { AlertCircle } from 'lucide-react'
import { createElement } from 'react'

export type EventType = 'exam' | 'assignment' | 'event' | 'quiz'
export type Priority = 'low' | 'medium' | 'high'

export const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const

export function getEventColor(type: string): string {
  switch (type) {
    case 'exam':
      return 'bg-red-500 text-red-700 border-red-200'
    case 'assignment':
      return 'bg-orange-500 text-orange-700 border-orange-200'
    case 'quiz':
      return 'bg-blue-500 text-blue-700 border-blue-200'
    case 'event':
      return 'bg-purple-500 text-purple-700 border-purple-200'
    default:
      return 'bg-slate-500 text-slate-700 border-slate-200'
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
