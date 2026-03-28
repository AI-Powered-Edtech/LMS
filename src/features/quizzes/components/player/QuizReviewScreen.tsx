import { AlertTriangle, ArrowLeft, CheckCircle, Flag, Send, Target } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { SubmitAnswer } from '@/src/features/quizzes'
import { cn } from '@/src/utils/cn'

import type { QuizAttemptQuestion, QuizOptionSnapshot } from '../../types/quizzes.types'
import { QuestionPalette } from './QuestionPalette'

interface QuizReviewScreenProps {
  questions: QuizAttemptQuestion[]
  answers: Record<string, SubmitAnswer>
  flagged: Set<string>
  onBack: () => void
  onSubmit: () => void
  onJump: (index: number) => void
  isSubmitting: boolean
}

function isQuestionAnswered(
  q: QuizAttemptQuestion,
  answers: Record<string, SubmitAnswer>
): boolean {
  const qType = q.question_type || 'MCQ'
  return ['SHORT_ANSWER', 'ESSAY'].includes(qType)
    ? !!answers[q.question_id]?.text_answer?.trim()
    : (answers[q.question_id]?.selected_option_ids?.length ?? 0) > 0
}

export function QuizReviewScreen({
  questions,
  answers,
  flagged,
  onBack,
  onSubmit,
  onJump,
  isSubmitting,
}: QuizReviewScreenProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const totalQuestions = questions.length
  const answeredCount = questions.filter((q) => isQuestionAnswered(q, answers)).length
  const unansweredCount = totalQuestions - answeredCount
  const flaggedCount = flagged.size

  const handleFinalSubmit = () => {
    if (unansweredCount > 0 && !showConfirm) {
      setShowConfirm(true)
      return
    }
    onSubmit()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 flex-1 w-full pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className={cn(
            'p-2.5 rounded-xl border-2 transition-all',
            'border-slate-200 dark:border-slate-700',
            'text-slate-600 dark:text-slate-300',
            'hover:bg-slate-100 dark:hover:bg-slate-800',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Review Jawaban</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Periksa kembali jawaban Anda sebelum mengirim
          </p>
        </div>
      </div>

      {/* Unanswered warning */}
      <AnimatePresence>
        {unansweredCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-start gap-3 p-4 rounded-2xl border',
              'bg-amber-50 dark:bg-amber-900/20',
              'border-amber-200 dark:border-amber-700/50'
            )}
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-300">
                Anda masih memiliki {unansweredCount} soal yang belum dijawab
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Sebaiknya Anda menjawab semua soal. Klik nomor soal di bawah untuk mengerjakannya.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Answered */}
        <div
          className={cn(
            'p-5 rounded-2xl border flex items-center gap-4',
            'bg-white dark:bg-slate-900',
            'border-slate-200 dark:border-slate-700',
            'shadow-sm'
          )}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {answeredCount}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Dijawab
            </p>
          </div>
        </div>

        {/* Unanswered */}
        <div
          className={cn(
            'p-5 rounded-2xl border flex items-center gap-4',
            'bg-white dark:bg-slate-900',
            'border-slate-200 dark:border-slate-700',
            'shadow-sm'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              unansweredCount > 0
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <Target
              className={cn(
                'w-6 h-6',
                unansweredCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {unansweredCount}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Belum Dijawab
            </p>
          </div>
        </div>

        {/* Flagged */}
        <div
          className={cn(
            'p-5 rounded-2xl border flex items-center gap-4',
            'bg-white dark:bg-slate-900',
            'border-slate-200 dark:border-slate-700',
            'shadow-sm'
          )}
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
            <Flag className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{flaggedCount}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ditandai
            </p>
          </div>
        </div>
      </div>

      {/* Answer summary list */}
      <div
        className={cn(
          'rounded-3xl border p-6 md:p-8',
          'bg-white dark:bg-slate-900',
          'border-slate-200 dark:border-slate-700',
          'shadow-sm'
        )}
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
          Ringkasan Jawaban
        </h3>
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {questions.map((q, i) => {
            const qType = q.question_type || 'MCQ'
            const isAnswered = isQuestionAnswered(q, answers)
            const isFlagged = flagged.has(q.question_id)

            let answerPreview: string
            if (!isAnswered) {
              answerPreview = 'Belum dijawab'
            } else if (['SHORT_ANSWER', 'ESSAY'].includes(qType)) {
              const raw = answers[q.question_id]?.text_answer || ''
              answerPreview = raw.length > 80 ? raw.substring(0, 80) + '...' : raw
            } else {
              const selectedIds = answers[q.question_id]?.selected_option_ids || []
              const selectedOptions =
                q.quiz_options?.filter((opt: QuizOptionSnapshot) => selectedIds.includes(opt.id)) ||
                []
              answerPreview = selectedOptions.map((opt: QuizOptionSnapshot) => opt.text).join(', ')
            }

            const questionText = q.text?.substring(0, 60) || `Soal ${i + 1}`
            const truncatedQuestion =
              (q.text?.length ?? 0) > 60 ? questionText + '...' : questionText

            return (
              <button
                key={q.id}
                onClick={() => onJump(i)}
                className={cn(
                  'w-full text-left p-3.5 rounded-xl border-l-4 transition-all',
                  'hover:shadow-md',
                  isAnswered
                    ? [
                        'border-l-emerald-500 dark:border-l-emerald-400',
                        'bg-emerald-50/60 dark:bg-emerald-900/10',
                        'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                      ]
                    : [
                        'border-l-amber-500 dark:border-l-amber-400',
                        'bg-amber-50/60 dark:bg-amber-900/10',
                        'hover:bg-amber-50 dark:hover:bg-amber-900/20',
                      ]
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold',
                      isAnswered
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">
                        {truncatedQuestion}
                      </span>
                      {isFlagged && (
                        <Flag className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400 shrink-0" />
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-xs mt-1 leading-relaxed',
                        !isAnswered
                          ? 'italic text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {answerPreview}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Question palette */}
      <div
        className={cn(
          'rounded-3xl border p-6 md:p-8',
          'bg-white dark:bg-slate-900',
          'border-slate-200 dark:border-slate-700',
          'shadow-sm'
        )}
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Navigasi Soal</h3>
        <QuestionPalette
          questions={questions}
          currentQuestionIdx={-1}
          answers={answers}
          flagged={flagged}
          onJump={onJump}
        />
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'rounded-2xl border p-6 text-center',
              'bg-red-50 dark:bg-red-900/20',
              'border-red-200 dark:border-red-700/50'
            )}
          >
            <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
              Apakah Anda yakin ingin mengirim kuis sekarang?
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-6">
              Anda masih memiliki soal yang belum dijawab. Jawaban tidak dapat diubah setelah kuis
              dikirim.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-bold text-sm border-2 transition-all',
                  'bg-white dark:bg-slate-800',
                  'text-slate-700 dark:text-slate-200',
                  'border-slate-200 dark:border-slate-600',
                  'hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition-all',
                  'bg-red-600 dark:bg-red-700',
                  'hover:bg-red-700 dark:hover:bg-red-600',
                  'disabled:opacity-50',
                  'shadow-sm shadow-red-200 dark:shadow-red-900/40'
                )}
              >
                {isSubmitting ? (
                  'Mengirim...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Ya, Kirim Sekarang
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      {!showConfirm && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white transition-all',
              'bg-gradient-to-r from-blue-600 to-indigo-600',
              'hover:from-blue-700 hover:to-indigo-700',
              'shadow-md shadow-blue-200 dark:shadow-blue-900/40',
              'disabled:opacity-50',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            )}
          >
            {isSubmitting ? (
              'Mengirim...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Kirim Kuis
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
