import { ArrowLeft, ArrowRight, CheckSquare } from 'lucide-react'
import { cn } from '@/src/utils/cn'

interface QuizFooterProps {
  currentQuestionIdx: number
  isLastQuestion: boolean
  onPrevious: () => void
  onNext: () => void
  onFinish: () => void
}

export function QuizFooter({
  currentQuestionIdx,
  isLastQuestion,
  onPrevious,
  onNext,
  onFinish,
}: QuizFooterProps) {
  const isFirst = currentQuestionIdx === 0

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 pb-6">
      {/* Previous button */}
      <button
        onClick={onPrevious}
        disabled={isFirst}
        className={cn(
          'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all duration-150 min-h-[44px]',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          isFirst
            ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
            : [
                'border-slate-200 dark:border-slate-600',
                'text-slate-700 dark:text-slate-200',
                'bg-white dark:bg-slate-800',
                'hover:bg-slate-50 dark:hover:bg-slate-700',
                'hover:border-slate-300 dark:hover:border-slate-500',
                'shadow-sm',
              ]
        )}
      >
        <ArrowLeft className="w-4 h-4" />
        Sebelumnya
      </button>

      {/* Next / Finish button */}
      {isLastQuestion ? (
        <button
          onClick={onFinish}
          className={cn(
            'flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-150 min-h-[44px] sm:ml-auto',
            'bg-gradient-to-r from-blue-600 to-indigo-600',
            'hover:from-blue-700 hover:to-indigo-700',
            'shadow-md shadow-blue-200 dark:shadow-blue-900/40',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            'dark:shadow-blue-900/30'
          )}
        >
          <CheckSquare className="w-4 h-4" />
          Selesai &amp; Review
        </button>
      ) : (
        <button
          onClick={onNext}
          className={cn(
            'flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-150 min-h-[44px] sm:ml-auto',
            'bg-gradient-to-r from-blue-600 to-indigo-600',
            'hover:from-blue-700 hover:to-indigo-700',
            'shadow-md shadow-blue-200 dark:shadow-blue-900/40',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            'dark:shadow-blue-900/30'
          )}
        >
          Selanjutnya
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
