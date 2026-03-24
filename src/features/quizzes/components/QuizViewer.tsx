import { AlertTriangle, CheckCircle, Clock, Cloud, FileText, Loader2, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useOptionalLearningSession } from '@/src/features/analytics'
import { type QuestionType, type QuizAttemptResult, quizService } from '@/src/features/quizzes'
import { useQuizAutosave } from '@/src/features/quizzes/hooks/useQuizAutosave'
import type { SubmitAnswer } from '@/src/features/quizzes/types/quizzes.types'
import { cn } from '@/src/utils/cn'

interface QuizOption {
  id: string
  text: string
}

interface QuizQuestion {
  id: string
  text: string
  order: number
  question_type?: QuestionType
  points?: number
  quiz_options: QuizOption[]
}

interface MultiTypeAnswer {
  selected_option_ids: string[]
  text_answer?: string
}

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
  const [answers, setAnswers] = useState<Record<string, MultiTypeAnswer>>({})
  const [result, setResult] = useState<QuizAttemptResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null)

  // Analytics: optional learning session for QUIZ_STARTED / QUIZ_SUBMITTED events
  const { trackEvent } = useOptionalLearningSession()

  const attemptIdRef = useRef<string | null>(null)
  const attemptVersionRef = useRef<number | undefined>(undefined)
  const attemptNumberRef = useRef<number | null>(null)
  const startAttemptPromise = useRef<Promise<{
    id: string
    version?: number
    attempt_number?: number
  }> | null>(null)

  // ── Autosave setup ───────────────────────────────────────
  // Create a saveProgress wrapper that converts answers to the expected format
  const quizServiceWithSaveProgress = useMemo(
    () => ({
      saveProgress: async (attemptId: string, answers: Record<string, unknown>) => {
        // Convert answers record to array format for batchSaveAnswers
        const submitAnswers: SubmitAnswer[] = Object.entries(answers).map(
          ([questionId, answer]) => ({
            question_id: questionId,
            selected_option_ids:
              (answer as { selected_option_ids?: string[] })?.selected_option_ids || [],
            text_answer: (answer as { text_answer?: string })?.text_answer,
          })
        )
        await quizService.batchSaveAnswers(attemptId, submitAnswers)
      },
    }),
    []
  )

  const { lastSaved, isSaving } = useQuizAutosave({
    attemptId: attemptId || '',
    answers: answers as Record<string, unknown>,
    quizService: quizServiceWithSaveProgress,
    intervalMs: 30000,
  })

  // State for showing the "tersimpan" indicator with fade
  const [showSavedIndicator, setShowSavedIndicator] = useState(false)

  // Show indicator when saved
  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSavedIndicator(true)
      const timer = setTimeout(() => setShowSavedIndicator(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSaved, isSaving])

  const ensureAttemptStarted = async () => {
    if (attemptIdRef.current) {
      return {
        id: attemptIdRef.current,
        version: attemptVersionRef.current,
        attempt_number: attemptNumberRef.current ?? undefined,
      }
    }

    if (startAttemptPromise.current) {
      return startAttemptPromise.current
    }

    startAttemptPromise.current = (async () => {
      onStartViewing()
      try {
        const res = await quizService.startQuizAttempt(quizId)
        attemptIdRef.current = res.attempt_id
        attemptVersionRef.current = res.version
        attemptNumberRef.current = res.attempt_number ?? null
        setAttemptId(res.attempt_id)
        attemptVersionRef.current = res.version
        setAttemptNumber(res.attempt_number ?? null)
        trackEvent('QUIZ_STARTED', { quiz_id: quizId, attempt: res.attempt_number ?? 1 })
        return { id: res.attempt_id, version: res.version, attempt_number: res.attempt_number }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memulai kuis'
        setError(message)
        attemptIdRef.current = null
        attemptVersionRef.current = undefined
        attemptNumberRef.current = null
        throw err
      } finally {
        startAttemptPromise.current = null
      }
    })()

    return startAttemptPromise.current
  }

  const hasAttemptsLeft = !maxAttempts || (attemptNumber ?? 0) < maxAttempts

  // ── Option selection for MCQ / TRUE_FALSE ──
  const handleSelectOption = async (questionId: string, optionId: string) => {
    await ensureAttemptStarted()
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selected_option_ids: [optionId] },
    }))
  }

  // ── Checkbox toggle for MULTIPLE_SELECT ──
  const handleToggleOption = async (questionId: string, optionId: string) => {
    await ensureAttemptStarted()
    setAnswers((prev) => {
      const current = prev[questionId]?.selected_option_ids || []
      const nextIds = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
      return { ...prev, [questionId]: { ...prev[questionId], selected_option_ids: nextIds } }
    })
  }

  // ── Text input for SHORT_ANSWER / ESSAY ──
  const handleTextChange = async (questionId: string, text: string) => {
    await ensureAttemptStarted()
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], selected_option_ids: [], text_answer: text },
    }))
  }

  const getQuestionType = (q: QuizQuestion): QuestionType => q.question_type || 'MCQ'

  const isQuestionAnswered = (q: QuizQuestion): boolean => {
    const ans = answers[q.id]
    if (!ans) return false
    const type = getQuestionType(q)
    if (type === 'SHORT_ANSWER' || type === 'ESSAY') return !!ans.text_answer?.trim()
    return ans.selected_option_ids.length > 0
  }

  const allAnswered = (questions ?? []).every((q) => isQuestionAnswered(q))

  const handleSubmit = async () => {
    if (!allAnswered || isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const currentAttempt = await ensureAttemptStarted()
      if (!currentAttempt || !currentAttempt.id) throw new Error('Could not start quiz attempt')

      const submitAnswers = questions.map((q) => ({
        question_id: q.id,
        selected_option_ids: answers[q.id]?.selected_option_ids || [],
        text_answer: answers[q.id]?.text_answer || undefined,
      }))

      const gradeResult = await quizService.submitQuizAttempt(
        currentAttempt.id,
        submitAnswers,
        currentAttempt.version
      )
      setResult(gradeResult)
      if (currentAttempt.attempt_number !== undefined && currentAttempt.attempt_number !== null) {
        setAttemptNumber(currentAttempt.attempt_number)
      }

      trackEvent('QUIZ_SUBMITTED', {
        quiz_id: quizId,
        score: gradeResult.score,
        max_score: 100,
        attempt: currentAttempt.attempt_number ?? 1,
      })

      if (gradeResult.passed) {
        onCompletionMet()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim jawaban')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    if (!hasAttemptsLeft) {
      setError(`Anda telah mencapai batas maksimal ${maxAttempts} percobaan.`)
      return
    }
    setAnswers({})
    setResult(null)
    setError(null)
    setAttemptId(null)
    attemptVersionRef.current = undefined
    setAttemptNumber(attemptNumber !== null ? attemptNumber : null)
    attemptIdRef.current = null
    attemptVersionRef.current = undefined
    attemptNumberRef.current = null
  }

  // ── Question Type Badge ──
  const QuestionTypeBadge = ({ type, points }: { type: QuestionType; points?: number }) => {
    const labels: Record<QuestionType, string> = {
      MCQ: 'Pilihan Ganda',
      TRUE_FALSE: 'Benar/Salah',
      MULTIPLE_SELECT: 'Pilih Beberapa',
      SHORT_ANSWER: 'Jawaban Singkat',
      ESSAY: 'Esai',
    }
    return (
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
          {labels[type]}
        </span>
        {points && <span className="text-xs text-slate-400">{points} poin</span>}
      </div>
    )
  }

  // ── Render question by type ──
  const renderQuestion = (question: QuizQuestion, qIdx: number) => {
    const type = getQuestionType(question)
    const ans = answers[question.id]

    return (
      <div key={question.id} className="space-y-3">
        <QuestionTypeBadge type={type} points={question.points} />
        <h3 className="font-bold text-slate-800">
          {qIdx + 1}. {question.text}
        </h3>

        {/* MCQ / TRUE_FALSE — Radio-style buttons */}
        {(type === 'MCQ' || type === 'TRUE_FALSE') && (
          <div className="space-y-2">
            {question.quiz_options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(question.id, option.id)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border-2 transition-colors font-medium text-sm',
                  ans?.selected_option_ids?.includes(option.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700'
                )}
              >
                {option.text}
              </button>
            ))}
          </div>
        )}

        {/* MULTIPLE_SELECT — Checkboxes */}
        {type === 'MULTIPLE_SELECT' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 italic">Pilih semua yang benar</p>
            {question.quiz_options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleToggleOption(question.id, option.id)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border-2 transition-colors font-medium text-sm flex items-center gap-3',
                  ans?.selected_option_ids?.includes(option.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700'
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs',
                    ans?.selected_option_ids?.includes(option.id)
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-300'
                  )}
                >
                  {ans?.selected_option_ids?.includes(option.id) && '✓'}
                </span>
                {option.text}
              </button>
            ))}
          </div>
        )}

        {/* SHORT_ANSWER — Single line text */}
        {type === 'SHORT_ANSWER' && (
          <div>
            <input
              type="text"
              value={ans?.text_answer || ''}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              placeholder="Ketik jawaban singkat..."
              className="w-full p-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 outline-none text-sm transition-colors"
            />
          </div>
        )}

        {/* ESSAY — Multi-line textarea */}
        {type === 'ESSAY' && (
          <div>
            <textarea
              value={ans?.text_answer || ''}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              placeholder="Tulis jawaban esai..."
              rows={6}
              className="w-full p-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 outline-none text-sm resize-y transition-colors"
            />
            <div className="text-right text-xs text-slate-400 mt-1">
              {(ans?.text_answer || '').length} karakter
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Result Screen ──
  if (result) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl p-8 text-center border shadow-sm',
            result.has_ungraded
              ? 'bg-amber-50 border-amber-200'
              : result.passed
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
          )}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
              result.has_ungraded ? 'bg-amber-100' : result.passed ? 'bg-green-100' : 'bg-red-100'
            )}
          >
            {result.has_ungraded ? (
              <Clock className="w-8 h-8 text-amber-600" />
            ) : result.passed ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {result.has_ungraded
              ? 'Jawaban Terkirim!'
              : result.passed
                ? 'Selamat! Kuis Lulus!'
                : 'Belum Lulus'}
          </h2>

          {result.has_ungraded ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Soal esai/jawaban singkat menunggu dinilai guru
                </span>
              </div>
              <div className="text-4xl font-bold text-amber-600 mt-2">{result.score}%</div>
              <p className="text-slate-500 text-xs mt-1">Skor sementara (soal otomatis)</p>
            </div>
          ) : (
            <>
              <div
                className="text-4xl font-bold mb-4"
                style={{ color: result.passed ? '#16a34a' : '#dc2626' }}
              >
                {result.score}%
              </div>
              <p className="text-slate-600 text-sm mb-6">
                {result.total_correct} dari {result.total_questions} jawaban benar
              </p>
            </>
          )}

          {!result.passed && !result.has_ungraded && (
            <div className="mt-3 space-y-1">
              {passingScore > 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Skor minimal untuk lulus: <span className="font-bold">{passingScore}%</span>
                </p>
              )}
              {hasAttemptsLeft && maxAttempts > 0 && (
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Anda dapat mengulang kuis ini{' '}
                  <span className="font-bold">{maxAttempts - (attemptNumber ?? 1)}</span> kali lagi
                </p>
              )}
            </div>
          )}
          {!result.passed && !result.has_ungraded && hasAttemptsLeft && (
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors mt-4"
            >
              Coba Lagi
            </button>
          )}
          {!result.passed && !result.has_ungraded && !hasAttemptsLeft && (
            <p className="text-sm text-red-600 font-semibold mt-4">
              Batas percobaan tercapai (maks {maxAttempts}).
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  // ── Quiz Form ──
  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto w-full h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 text-orange-500 font-bold mb-2">
        <AlertTriangle className="w-5 h-5" />
        {title.startsWith('Kuis') ? title : `Kuis: ${title}`}
      </div>

      {instructions && <p className="text-slate-600 text-sm mb-8">{instructions}</p>}

      <div className="space-y-6">
        {questions
          .sort((a, b) => a.order - b.order)
          .map((question, qIdx) => renderQuestion(question, qIdx))}
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

      {/* Autosave indicator - bottom right, fades after 2s */}
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
