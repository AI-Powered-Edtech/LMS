import { AlertCircle, CheckCircle, Loader2, MessageSquare, Save, Sparkles } from 'lucide-react'

import { OptimizedImage } from '@/components/ui'
import { cn } from '@/utils/cn'

import type { RubricItem, SpeedGraderStudent } from './types'
import { QUICK_COMMENTS } from './types'

interface RubricPanelProps {
  currentStudent: SpeedGraderStudent
  rubric: RubricItem[]
  scores: Record<string, number>
  feedback: string
  totalScore: number
  isLoading: boolean
  isAIGrading: boolean
  onScoreSelect: (criterionId: string, points: number) => void
  onFeedbackChange: (feedback: string) => void
  onAIGrade: () => void
  onSaveAndNext: (status: 'graded' | 'needs_revision') => void
}

function StudentInfoHeader({
  student,
  totalScore,
  isLoading,
}: {
  student: SpeedGraderStudent
  totalScore: number
  isLoading: boolean
}) {
  if (!student) return null
  return (
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
          <OptimizedImage
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student?.name || ''}`}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{student?.name}</h3>
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              student.gradeEntry.status === 'graded'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : student.gradeEntry.status === 'needs_revision'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            )}
          >
            {student.gradeEntry.status === 'graded'
              ? 'Sudah Dinilai'
              : student.gradeEntry.status === 'needs_revision'
                ? 'Perlu Revisi'
                : 'Belum Dinilai'}
          </span>
        </div>
      </div>

      <div className="text-right">
        {isLoading ? (
          <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ml-auto mb-1" />
        ) : (
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
            {totalScore}
          </div>
        )}
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Nilai Akhir
        </div>
      </div>
    </div>
  )
}

function RubricSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="grid gap-2 mt-4">
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RubricPanel({
  currentStudent,
  rubric,
  scores,
  feedback,
  totalScore,
  isLoading,
  isAIGrading,
  onScoreSelect,
  onFeedbackChange,
  onAIGrade,
  onSaveAndNext,
}: RubricPanelProps) {
  const addQuickComment = (comment: string) => {
    onFeedbackChange(feedback ? `${feedback}\n${comment}` : comment)
  }

  return (
    <div className="w-full md:w-96 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      <StudentInfoHeader student={currentStudent} totalScore={totalScore} isLoading={isLoading} />

      {/* Rubric Matrix */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {isLoading ? (
          <RubricSkeleton />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 dark:text-white">Rubrik Penilaian</h3>
              <button
                onClick={onAIGrade}
                disabled={isAIGrading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isAIGrading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isAIGrading ? 'AI Menilai...' : 'Auto-Grade AI'}
              </button>
            </div>

            {rubric.map((item) => (
              <div key={item.id} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{item.criterion}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                    {scores[item.id] || 0} / {item.maxPoints}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {item.levels.map((level) => {
                    const isSelected = scores[item.id] === level.points
                    return (
                      <button
                        key={level.points}
                        onClick={() => onScoreSelect(item.id, level.points)}
                        className={cn(
                          'text-left p-3 rounded-xl border text-sm transition-all',
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 shadow-sm shadow-blue-100 dark:shadow-none'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={cn(
                              'font-bold',
                              isSelected
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-slate-700 dark:text-slate-300'
                            )}
                          >
                            {level.points} Poin
                          </span>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-xs leading-relaxed',
                            isSelected
                              ? 'text-blue-600/80 dark:text-blue-400/80'
                              : 'text-slate-500 dark:text-slate-400'
                          )}
                        >
                          {level.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* General Feedback */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Umpan Balik (Opsional)
              </h4>
              <textarea
                value={feedback}
                onChange={(e) => onFeedbackChange(e.target.value)}
                placeholder="Berikan komentar tambahan untuk siswa..."
                className="w-full h-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 dark:text-white transition-all resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {QUICK_COMMENTS.map((comment, idx) => (
                  <button
                    key={idx}
                    onClick={() => addQuickComment(comment)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {comment}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
        <button
          onClick={() => onSaveAndNext('needs_revision')}
          disabled={isLoading}
          className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <AlertCircle className="w-5 h-5" />
          Minta Revisi
        </button>
        <button
          onClick={() => onSaveAndNext('graded')}
          disabled={isLoading}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200 dark:shadow-none active:scale-95 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          Simpan & Lanjut
        </button>
      </div>
    </div>
  )
}
