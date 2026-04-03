// ==========================================================================
// TrafficLightCard — Status semaphore besar untuk orang tua
// ==========================================================================

import { cn } from '@/utils/cn'

import type { TrafficLightStatus } from '../types'

interface TrafficLightCardProps {
  status: TrafficLightStatus
  reason: string
  childName: string
}

const CONFIG = {
  green: {
    emoji: '🟢',
    label: 'SEMUA BAIK',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800/40',
    textColor: 'text-green-800 dark:text-green-200',
    subColor: 'text-green-700 dark:text-green-300',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
  },
  yellow: {
    emoji: '🟡',
    label: 'PERLU PERHATIAN',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800/40',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    subColor: 'text-yellow-700 dark:text-yellow-300',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
  },
  red: {
    emoji: '🔴',
    label: 'BUTUH TINDAKAN',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/40',
    textColor: 'text-red-800 dark:text-red-200',
    subColor: 'text-red-700 dark:text-red-300',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
  },
} as const

export function TrafficLightCard({ status, reason, childName }: TrafficLightCardProps) {
  const config = CONFIG[status]

  return (
    <div
      className={cn('rounded-2xl border p-4 flex items-center gap-4', config.bg, config.border)}
      role="status"
      aria-label={`Status ${childName}: ${config.label}`}
    >
      {/* Emoji status */}
      <div
        className={cn(
          'flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl',
          config.iconBg
        )}
        aria-hidden="true"
      >
        {config.emoji}
      </div>

      {/* Teks */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs font-semibold tracking-wider uppercase', config.subColor)}>
          Status {childName}
        </p>
        <p className={cn('text-xl font-bold leading-tight mt-0.5', config.textColor)}>
          {config.label}
        </p>
        <p className={cn('text-sm mt-1 leading-snug', config.subColor)}>{reason}</p>
      </div>
    </div>
  )
}
