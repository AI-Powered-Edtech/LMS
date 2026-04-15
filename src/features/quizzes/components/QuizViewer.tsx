import { AlertTriangle, Cloud, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import type { QuizQuestion } from '@/features/quizzes/hooks/quizViewerTypes'
import { useQuizViewerState } from '@/features/quizzes/hooks/useQuizViewerState'
import { cn } from '@/utils/cn'

import { QuizViewerQuestion } from './QuizViewerQuestion'
import { QuizViewerResult } from './QuizViewerResult'

interface QuizViewerProps {
  quizId: string
  title: string
  instructions: string | null
  questions: QuizQuestion[]
  maxAttempts: number
  passingScore?: number
  isCompleted: boolean
  onCompletionMet: () => void
  onStartViewing: () => void
}

export function QuizViewer({
  quizId,
  title,
  instructions,
  questions,
  maxAttempts,
  passingScore = 0,
  isCompleted: _isCompleted,
  onCompletionMet,
  onStartViewing,
}: QuizViewerProps) {
  const {
    answers,
    result,
    isSubmitting,
    error,
    attemptNumber,
    hasAttemptsLeft,
    showSavedIndicator,
    isSaving,
    allAnswered,
    handleSelectOption,
    handleToggleOption,
    handleTextChange,
    getQuestionType,
    isQuestionAnswered,
    handleSubmit,
    handleRetry,
  } = useQuizViewerState({
    quizId,
    questions,
    maxAttempts,
    onCompletionMet,
    onStartViewing,
  })

  if (result) {
    return (
      <QuizViewerResult
        result={result}
        passingScore={passingScore}
        maxAttempts={maxAttempts}
        attemptNumber={attemptNumber}
        hasAttemptsLeft={hasAttemptsLeft}
        onRetry={handleRetry}
      />
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto w-full h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 text-orange-500 font-bold mb-2">
        <AlertTriangle className="w-5 h-5" />
        {title.startsWith('Kuis') ? title : `Kuis: ${title}`}
      </div>

      {instructions && <p className="text-slate-600 text-sm mb-8">{instructions}</p>}

      <div className="space-y-6">
        {[...questions]
          .sort((a, b) => a.order - b.order)
          .map((question, qIdx) => (
            <QuizViewerQuestion
              key={question.id}
              question={question}
              questionIndex={qIdx}
              answer={answers[question.id]}
              questionType={getQuestionType(question)}
              onSelectOption={handleSelectOption}
              onToggleOption={handleToggleOption}
              onTextChange={handleTextChange}
            />
          ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || isSubmitting}
        className={cn(
          'w-full mt-6 py-3 rounded-xl font-bold text-white transition-colors',
          allAnswered && !isSubmitting
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-slate-300 cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
          </span>
        ) : (
          `Kirim Jawaban (${questions.filter((q) => isQuestionAnswered(q)).length}/${questions.length})`
        )}
      </button>

      {/* Autosave indicator */}
      <AnimatePresence>
        {(showSavedIndicator || isSaving) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border',
                isSaving
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-green-50 border-green-200 text-green-700'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Jawaban tersimpan</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
