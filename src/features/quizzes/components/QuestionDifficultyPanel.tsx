// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { BarChart3, Loader2 } from 'lucide-react'

import type { QuestionDifficulty } from '@/src/features/quizzes/api/quizAnalyticsService'
import { cn } from '@/src/utils/cn'

interface QuestionDifficultyPanelProps {
  questionDifficulty: QuestionDifficulty[]
  isDifficultyLoading: boolean
}

export function QuestionDifficultyPanel({
  questionDifficulty,
  isDifficultyLoading,
}: QuestionDifficultyPanelProps) {
  if (questionDifficulty.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Tingkat Kesulitan Soal</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
          % siswa menjawab benar
        </span>
      </div>
      {isDifficultyLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Memuat...</span>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {questionDifficulty.map((question, index) => {
            const percent = question.difficulty_percent ?? 0
            const barColor =
              percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
            const labelColor =
              percent >= 70 ? 'text-emerald-600' : percent >= 40 ? 'text-amber-600' : 'text-red-600'
            const label = percent >= 70 ? 'Mudah' : percent >= 40 ? 'Sedang' : 'Sulit'

            return (
              <div key={question.question_id} className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-6 text-right shrink-0">
                  {index + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate mb-1">
                    {question.question_text}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', barColor)}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className={cn('text-xs font-bold w-16 text-right shrink-0', labelColor)}>
                      {percent}%{' '}
                      <span className="font-normal text-slate-400 dark:text-slate-500 text-[10px]">
                        {label}
                      </span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {question.correct_count} / {question.total_attempts} siswa benar
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
