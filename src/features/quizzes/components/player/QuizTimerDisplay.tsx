import { PauseCircle, Timer } from 'lucide-react'

import { cn } from '@/utils/cn'

interface QuizTimerProps {
  timeLeft: number
  isPaused?: boolean
}

export function QuizTimerDisplay({ timeLeft, isPaused = false }: QuizTimerProps) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const isWarning = timeLeft <= 300 && timeLeft > 60
  const isCritical = timeLeft <= 60

  if (isPaused) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300',
          'bg-amber-50 dark:bg-amber-900/20',
          'border-amber-200 dark:border-amber-700',
          'text-amber-700 dark:text-amber-400',
          'animate-pulse'
        )}
        aria-label="Kuis sedang dijeda"
      >
        <PauseCircle className="w-5 h-5" />
        <span className="font-mono text-sm font-bold tracking-widest uppercase">DIJEDA</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300',
        isCritical
          ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 animate-pulse shadow-sm shadow-red-100 dark:shadow-red-900/20'
          : isWarning
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
      )}
    >
      <Timer className="w-5 h-5" />
      <span className="font-mono text-lg font-bold min-w-[50px] text-center tabular-nums">
        {formattedTime}
      </span>
    </div>
  )
}
