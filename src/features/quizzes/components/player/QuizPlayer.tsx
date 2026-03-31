// Quiz Player - Orchestrator component
// Part of the Quiz Engine Refactor

import { Eye, WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { cn } from '@/utils/cn'

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
  const [isResuming, setIsResuming] = useState(false)
  const [resumeToast, setResumeToast] = useState<{ show: boolean; current: number; total: number }>(
    { show: false, current: 0, total: 0 }
  )

  const totalQuestions = attemptQuestions.length
  const question = attemptQuestions[currentQuestionIdx]
  const resetStore = useQuizPlayerStore((state) => state.resetStore)

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
          // Auto-hide toast after 2 seconds
          setTimeout(() => {
            setResumeToast((prev) => ({ ...prev, show: false }))
          }, 2000)
        }
      } catch (error) {
        // Gracefully fallback to initial index on error
        if (import.meta.env.DEV) console.error('Failed to compute resume index:', error)
      } finally {
        setIsResuming(false)
      }
    }

    computeResumeIndex()
  }, [attemptId, attemptQuestions, initialAnswers, initialQuestionIndex])

  // ── Hooks composition ───────────────────────────────────
  const { timeLeft, progressColor } = useQuizTimer({
    expiresAt,
    timeLimitMinutes: quiz.time_limit_minutes || 10,
    onTimeUp: () => onSubmit(answers),
  })

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

  const { tabWarning } = useAntiCheat({ attemptId })

  useQuizHeartbeat({ attemptId, intervalMs: 30000 })

  // ── Answer handling ─────────────────────────────────────
  // Note: Autosave is now handled by useQuizAutosave interval (30s)
  // No need to call setAutoSaveAnswer on each answer change
  const handleAnswer = useCallback((questionId: string, answer: SubmitAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  // ── Keyboard navigation ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return

      if (e.key === 'ArrowRight' && currentQuestionIdx < totalQuestions - 1 && !showReview) {
        setCurrentQuestionIdx((i) => i + 1)
      }
      if (e.key === 'ArrowLeft' && currentQuestionIdx > 0 && !showReview) {
        setCurrentQuestionIdx((i) => i - 1)
      }
      if (e.key.toLowerCase() === 'f' && question && !showReview) {
        setFlagged((prev) => {
          const next = new Set(prev)
          if (next.has(question.question_id)) next.delete(question.question_id)
          else next.add(question.question_id)
          return next
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentQuestionIdx, totalQuestions, question, showReview])

  // ── beforeunload warning ────────────────────────────────
  useEffect(() => {
    if (showReview) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [showReview])

  // ── Flag toggle ───────────────────────────────────────
  const toggleFlag = (id: string) => {
    setFlagged((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Review Screen ───────────────────────────────────────
  if (showReview) {
    return (
      <QuizReviewScreen
        questions={attemptQuestions}
        answers={answers}
        flagged={flagged}
        onBack={() => setShowReview(false)}
        onSubmit={() => onSubmit(answers)}
        onJump={(index) => {
          setCurrentQuestionIdx(index)
          setShowReview(false)
        }}
        isSubmitting={isSubmitting}
      />
    )
  }

  // Show skeleton while computing resume index
  if (isResuming) {
    return (
      <div className="flex-1 w-full flex flex-col items-center px-4 md:px-6 lg:px-8">
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

  if (!question) return null

  const isLastQuestion = currentQuestionIdx === totalQuestions - 1
  const questionType = question.question_type || 'MCQ'
  const currentAnswer = answers[question.question_id]

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 md:px-6 lg:px-8">
      <div className="w-full max-w-6xl">
        {/* ── Floating Warnings ─────────────────────────── */}
        {tabWarning && (
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

        {/* ── Header ────────────────────────────────────── */}
        <QuizHeader
          title={quiz.title}
          currentQuestionIdx={currentQuestionIdx}
          totalQuestions={totalQuestions}
          saveStatus={saveStatus}
          isOnline={isOnline}
          timeLeft={timeLeft}
        />

        {/* ── 2-Column Layout ───────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — Desktop only */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-6 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <QuestionPalette
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
