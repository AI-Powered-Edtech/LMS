// Quiz Player - Orchestrator component
// Part of the Quiz Engine Refactor

import { Eye, Monitor, WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { cn } from '@/utils/cn'
import { captureError } from '@/utils/sentry'

import * as quizPlayerService from '../../api/quizPlayer.service'
import { getCurrentQuestionIndex } from '../../api/quizPlayer.service'
import { useAntiCheat } from '../../hooks/useAntiCheat'
import { useQuizAutosave } from '../../hooks/useQuizAutosave'
import { useQuizHeartbeat } from '../../hooks/useQuizHeartbeat'
import { useQuizTimer } from '../../hooks/useQuizTimer'
import { useQuizPlayerStore } from '../../store/quizPlayer.store'
import type { QuizAttemptQuestion, SubmitAnswer } from '../../types/quizzes.types'
import type { SaveStatus } from '../../types/quizzes.types'
import { QuestionPalette } from './QuestionPalette'
import { QuizBody } from './QuizBody'
import { QuizFooter } from './QuizFooter'
import { QuizHeader } from './QuizHeader'
import { QuizReviewScreen } from './QuizReviewScreen'

interface QuizPlayerProps {
  attemptId: string
  expiresAt: string | null
  quiz: {
    id: string
    title: string
    time_limit_minutes?: number
  }
  attemptQuestions: QuizAttemptQuestion[]
  initialAnswers?: Record<string, SubmitAnswer>
  initialQuestionIndex?: number
  onSubmit: (answers: Record<string, SubmitAnswer>) => void
  isSubmitting: boolean
}

// SaveStatus imported from types for internal use

export function QuizPlayer({
  attemptId,
  expiresAt,
  quiz,
  attemptQuestions,
  initialAnswers = {},
  initialQuestionIndex = 0,
  onSubmit,
  isSubmitting,
}: QuizPlayerProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(initialQuestionIndex)
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [showReview, setShowReview] = useState(false)
  const [answers, setAnswers] = useState<Record<string, SubmitAnswer>>(initialAnswers)
  const [submitted, setSubmitted] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [resumeToast, setResumeToast] = useState<{ show: boolean; current: number; total: number }>(
    { show: false, current: 0, total: 0 }
  )
  const [pauseError, setPauseError] = useState<string | null>(null)
  // QUIZ-HIGH-06: Ref to track the resume toast timeout so it can be cleared on unmount
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const totalQuestions = attemptQuestions.length
  const question = attemptQuestions[currentQuestionIdx]
  const resetStore = useQuizPlayerStore((state) => state.resetStore)

  // QUIZ-CRIT-03/04: Keep a stable ref to latest answers so the timer callback
  // always submits current answers even when the closure is stale
  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    // Reset store state when attempt changes
    // NOTE: Extract resetStore via selector (not the whole store) to avoid
    // infinite re-render: whole-store subscription → state change → new ref → effect re-fires
    resetStore()
    return () => {
      resetStore()
    }
  }, [attemptId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resume logic: compute current question index from saved answers on mount
  useEffect(() => {
    const computeResumeIndex = async () => {
      // Check if there's a saved attempt (initialAnswers has content)
      const hasSavedAnswers = Object.keys(initialAnswers).length > 0
      if (!hasSavedAnswers || attemptQuestions.length === 0) {
        return
      }

      setIsResuming(true)

      try {
        // Compute the current question index from saved answers
        const resumeIndex = getCurrentQuestionIndex(attemptQuestions, initialAnswers)

        // Only update if the computed index is different from initial
        if (resumeIndex > 0 && resumeIndex !== initialQuestionIndex) {
          setCurrentQuestionIdx(resumeIndex)
          // Show toast notification
          setResumeToast({
            show: true,
            current: resumeIndex + 1,
            total: attemptQuestions.length,
          })
          // Auto-hide toast after 2 seconds (stored in ref for cleanup)
          resumeTimeoutRef.current = setTimeout(() => {
            setResumeToast((prev) => ({ ...prev, show: false }))
          }, 2000)
        }
      } catch (error) {
        // Gracefully fallback to initial index on error
        captureError(error, { context: 'QuizPlayer.computeResumeIndex' })
        if (import.meta.env.DEV) console.error('Failed to compute resume index:', error)
      } finally {
        setIsResuming(false)
      }
    }

    void computeResumeIndex()
    // QUIZ-HIGH-06: Clear the toast timeout on cleanup to prevent memory leak / state update on unmounted component
    return () => {
      clearTimeout(resumeTimeoutRef.current)
    }
  }, [attemptId, attemptQuestions, initialAnswers, initialQuestionIndex])

  // Print prevention: sembunyikan konten kuis saat print
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'quiz-print-prevention'
    style.textContent = `@media print { .quiz-player-root { display: none !important; } }`
    document.head.appendChild(style)
    return () => {
      document.getElementById('quiz-print-prevention')?.remove()
    }
  }, [])

  // ── Hooks composition ───────────────────────────────────
  const {
    timeLeft,
    progressColor,
    isPaused,
    pausesRemaining,
    pauseCountdown,
    pauseTimer,
    resumeTimer,
  } = useQuizTimer({
    expiresAt,
    timeLimitMinutes: quiz.time_limit_minutes || 10,
    attemptId,
    // QUIZ-CRIT-03: Guard against submitting while already submitting (race condition)
    // QUIZ-CRIT-04: Use answersRef so timer closure always has the latest answers
    onTimeUp: () => {
      if (!isSubmitting) submitQuiz()
    },
  })

  // Handlers with error surface
  const handlePause = useCallback(async () => {
    setPauseError(null)
    try {
      await pauseTimer()
    } catch {
      setPauseError('Gagal mempause kuis. Silakan coba lagi.')
    }
  }, [pauseTimer])

  const handleResume = useCallback(async () => {
    setPauseError(null)
    try {
      await resumeTimer()
    } catch {
      setPauseError('Gagal melanjutkan kuis. Silakan coba lagi.')
    }
  }, [resumeTimer])

  // Create a saveProgress wrapper for the quiz service
  const quizServiceWithSaveProgress = useMemo(
    () => ({
      saveProgress: async (attemptId: string, answers: Record<string, unknown>) => {
        const submitAnswers: SubmitAnswer[] = Object.entries(answers).map(
          ([questionId, answer]) => ({
            question_id: questionId,
            selected_option_ids: (answer as SubmitAnswer).selected_option_ids || [],
            text_answer: (answer as SubmitAnswer).text_answer,
          })
        )
        await quizPlayerService.batchSaveAnswers(attemptId, submitAnswers)
      },
    }),
    []
  )

  // Use interval-based autosave (replaces debounced autosave + heartbeat dedup)
  const { lastSaved, isSaving } = useQuizAutosave({
    attemptId,
    answers: answers as Record<string, unknown>,
    quizService: quizServiceWithSaveProgress,
    intervalMs: 30000,
  })

  // Map to compatible interface for QuizHeader
  const saveStatus: SaveStatus = isSaving ? 'saving' : lastSaved ? 'saved' : 'idle'
  const { isOnline } = useNetworkStatus()

  const { tabWarning, devToolsWarning } = useAntiCheat({ attemptId })

  useQuizHeartbeat({ attemptId, intervalMs: 30000 })

  // ── Answer handling ─────────────────────────────────────
  // Note: Autosave is now handled by useQuizAutosave interval (30s)
  // No need to call setAutoSaveAnswer on each answer change
  const handleAnswer = useCallback(
    (questionId: string, answer: SubmitAnswer) => {
      if (submitted) return
      setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    },
    [submitted]
  )

  const submitQuiz = useCallback(() => {
    onSubmit(answersRef.current)
    setSubmitted(true)
  }, [onSubmit])

  const toggleFlag = (id: string) => {
    setFlagged((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Keyboard navigation ────────────────────────────────

  // Show skeleton while computing resume index
  if (isResuming) {
    return (
      <div className="quiz-player-root select-none flex-1 w-full flex flex-col items-center px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-6xl space-y-6">
          {/* Header skeleton */}
          <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
          {/* Content skeleton */}
          <div className="flex gap-6">
            <div className="hidden lg:block w-64">
              <div className="h-96 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
            </div>
            <div className="flex-1 space-y-6">
              <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
              <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showReview) {
    return (
      <QuizReviewScreen
        data-testid="quiz-review-screen"
        questions={attemptQuestions}
        answers={answers}
        flagged={flagged}
        onBack={() => setShowReview(false)}
        onSubmit={submitQuiz}
        onJump={(index) => {
          setCurrentQuestionIdx(index)
          setShowReview(false)
        }}
        isSubmitting={isSubmitting}
      />
    )
  }

  if (!question) return null

  const isLastQuestion = currentQuestionIdx === totalQuestions - 1
  const questionType = question.question_type || 'MCQ'
  const currentAnswer = answers[question.question_id]

  return (
    <div className="quiz-player-root select-none flex-1 w-full flex flex-col items-center px-4 md:px-6 lg:px-8">
      <div className="w-full max-w-6xl">
        {/* ── Floating Warnings ─────────────────────────── */}
        {tabWarning && !isPaused && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-lg">
              <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                  Anda meninggalkan tab kuis
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Aktivitas ini telah dicatat
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── DevTools Warning ──────────────────────────── */}
        {devToolsWarning && !isPaused && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 px-5 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl shadow-lg">
              <Monitor className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-red-800 dark:text-red-300 text-sm">
                  Alat pengembang terdeteksi
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Aktivitas ini telah dicatat oleh sistem pengawas
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                  Jika ini adalah kesalahan, tutup semua panel browser tambahan dan lanjutkan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Resume Toast ─────────────────────────── */}
        <AnimatePresence>
          {resumeToast.show && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border border-blue-200 rounded-2xl shadow-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-bold">{resumeToast.current}</span>
                </div>
                <p className="font-medium text-blue-800 text-sm">
                  Melanjutkan dari pertanyaan {resumeToast.current}/{resumeToast.total}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isOnline && (
          <div className="mb-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
              <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                  Koneksi terputus
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Jawaban Anda disimpan secara lokal dan akan disinkronkan saat online
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Pause error banner ─────────────────────────── */}
        {pauseError && (
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{pauseError}</p>
              <button
                onClick={() => setPauseError(null)}
                className="text-red-500 dark:text-red-400 hover:text-red-700 text-xs font-bold shrink-0"
                aria-label="Tutup pesan error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Header ────────────────────────────────────── */}
        <QuizHeader
          data-testid="quiz-header"
          title={quiz.title}
          currentQuestionIdx={currentQuestionIdx}
          totalQuestions={totalQuestions}
          saveStatus={saveStatus}
          isOnline={isOnline}
          timeLeft={timeLeft}
          isPaused={isPaused}
          pausesRemaining={pausesRemaining}
          pauseCountdown={pauseCountdown}
          onPause={handlePause}
          onResume={handleResume}
        />

        {/* ── Pause Overlay ─────────────────────────────── */}
        {isPaused && (
          <div
            className={cn(
              'relative rounded-2xl border overflow-hidden mb-6',
              'bg-amber-50/60 dark:bg-amber-900/10',
              'border-amber-200 dark:border-amber-800'
            )}
          >
            {/* Semi-transparent backdrop */}
            <div
              className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm z-10 rounded-2xl"
              aria-hidden="true"
            />
            {/* Overlay content */}
            <div className="relative z-20 flex flex-col items-center justify-center py-16 px-6 gap-5">
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  'bg-amber-100 dark:bg-amber-900/40',
                  'border-2 border-amber-300 dark:border-amber-700'
                )}
              >
                <span className="text-3xl">⏸</span>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Kuis Dijeda
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  Soal disembunyikan selama jeda. Klik "Lanjutkan" untuk melanjutkan kuis.
                </p>
                <p className="text-sm font-mono font-semibold text-amber-700 dark:text-amber-400">
                  Auto-resume dalam {Math.floor(pauseCountdown / 60)}:
                  {(pauseCountdown % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <button
                data-testid="quiz-pause-button"
                onClick={handlePause}
                className={cn(
                  'flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-base',
                  'bg-green-500 dark:bg-green-600 text-white',
                  'hover:bg-green-600 dark:hover:bg-green-700',
                  'transition-all duration-200 active:scale-95',
                  'shadow-md shadow-green-200 dark:shadow-green-900/30'
                )}
              >
                <span>▶</span>
                <span>Lanjutkan Kuis</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 2-Column Layout ───────────────────────────── */}
        <div
          className={cn(
            'flex flex-col lg:flex-row gap-6',
            // Blur content during pause to prevent viewing questions
            isPaused && 'pointer-events-none select-none filter blur-sm opacity-30'
          )}
          aria-hidden={isPaused}
        >
          {/* Sidebar — Desktop only */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-6 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <QuestionPalette
                  data-testid="quiz-sidebar"
                  questions={attemptQuestions}
                  currentQuestionIdx={currentQuestionIdx}
                  answers={answers}
                  flagged={flagged}
                  onJump={setCurrentQuestionIdx}
                  orientation="vertical"
                />
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Mobile Question Palette — horizontally scrollable */}
            <div className="lg:hidden">
              <QuestionPalette
                questions={attemptQuestions}
                currentQuestionIdx={currentQuestionIdx}
                answers={answers}
                flagged={flagged}
                onJump={setCurrentQuestionIdx}
                orientation="horizontal"
              />
            </div>

            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuenow={currentQuestionIdx + 1}
              aria-valuemin={1}
              aria-valuemax={totalQuestions}
              aria-label={`Soal ${currentQuestionIdx + 1} dari ${totalQuestions}`}
              className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
            >
              <div
                className={cn('h-full transition-all duration-300 rounded-full', progressColor)}
                style={{ width: `${((currentQuestionIdx + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            {/* Question Body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, pointerEvents: 'none' as unknown as undefined }}
                transition={{ duration: 0.2 }}
              >
                <QuizBody
                  question={question}
                  questionType={questionType}
                  currentAnswer={currentAnswer}
                  isFlagged={flagged.has(question.question_id)}
                  onToggleFlag={toggleFlag}
                  onAnswer={handleAnswer}
                />
              </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <QuizFooter
              data-testid="quiz-footer"
              currentQuestionIdx={currentQuestionIdx}
              isLastQuestion={isLastQuestion}
              onPrevious={() => setCurrentQuestionIdx((i) => i - 1)}
              onNext={() => setCurrentQuestionIdx((i) => i + 1)}
              onFinish={() => setShowReview(true)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
