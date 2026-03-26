import { cn } from '@/src/utils/cn'
import { AutosaveIndicator, SaveStatus } from './AutosaveIndicator'
import { QuizTimerDisplay } from './QuizTimerDisplay'

interface QuizHeaderProps {
  title: string
  currentQuestionIdx: number
  totalQuestions: number
  saveStatus: SaveStatus
  isOnline: boolean
  timeLeft: number | null
}

export function QuizHeader({
  title,
  currentQuestionIdx,
  totalQuestions,
  saveStatus,
  isOnline,
  timeLeft,
}: QuizHeaderProps) {
  const progress = ((currentQuestionIdx + 1) / totalQuestions) * 100

  return (
    <div
      className={cn(
        'mb-6 rounded-2xl border overflow-hidden',
        'bg-white dark:bg-slate-900',
        'border-slate-200 dark:border-slate-700',
        'shadow-sm'
      )}
    >
      {/* Progress bar — full width strip at top */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4">
        {/* Left — title + breadcrumb */}
        <div className="min-w-0 flex-1 mr-4">
          <h1 className="text-base md:text-lg lg:text-xl font-bold text-slate-900 dark:text-slate-50 truncate leading-tight">
            {title}
          </h1>
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-md',
                'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              )}
            >
              Soal {currentQuestionIdx + 1} dari {totalQuestions}
            </span>
            <AutosaveIndicator status={!isOnline ? 'offline' : saveStatus} />
          </div>
        </div>

        {/* Right — timer */}
        {timeLeft !== null && (
          <div className="shrink-0">
            <QuizTimerDisplay timeLeft={timeLeft} />
          </div>
        )}
      </div>
    </div>
  )
}
