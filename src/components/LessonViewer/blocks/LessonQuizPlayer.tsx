// Bridge component: connects BlockRenderer quiz data → QuizPlayer (new engine)
// Handles attempt lifecycle (start/resume) and delegates to QuizPlayer

import { AlertTriangle, CheckCircle, Loader2, Play, RotateCcw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import * as quizPlayerService from '@/features/quizzes/api/quizPlayer.service'
import { QuizPlayer } from '@/features/quizzes/components/player/QuizPlayer'
import {
  useStartQuizAttempt,
  useSubmitQuizAttempt,
} from '@/features/quizzes/queries/quizPlayer.mutations'
import { useUserAttempts } from '@/features/quizzes/queries/quizPlayer.queries'
import type { QuizAttemptQuestion, SubmitAnswer } from '@/features/quizzes/types/quizzes.types'
import { useToast } from '@/hooks/useToast'
import { captureError } from '@/utils/sentry'

interface LessonQuizPlayerProps {
  quizId: string
  title: string
  instructions: string | null
  timeLimitMinutes?: number
  maxAttempts: number
  passingScore: number
  isCompleted: boolean
  onCompletionMet: () => void
  onStartViewing: () => void
}

type PlayerState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | {
      phase: 'ready'
      attemptId: string
      expiresAt: string | null
      questions: QuizAttemptQuestion[]
      initialAnswers: Record<string, SubmitAnswer>
      initialIndex: number
    }
  | { phase: 'submitted'; score: number | null; passed: boolean | null }
  | { phase: 'error'; message: string }

export function LessonQuizPlayer({
  quizId,
  title,
  instructions,
  timeLimitMinutes,
  maxAttempts,
  passingScore,
  isCompleted,
  onCompletionMet,
  onStartViewing,
}: LessonQuizPlayerProps) {
  const { user, tenantId } = useAuth()
  const { addToast } = useToast()
  const [state, setState] = useState<PlayerState>({ phase: 'idle' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  // LQP-3 FIX: Track attempt count — initialised from server to survive refresh
  const { data: allAttempts } = useUserAttempts(tenantId ?? undefined)
  const serverAttemptCount = useMemo(
    () => allAttempts?.filter((a) => a.quiz_id === quizId).length ?? 0,
    [allAttempts, quizId]
  )
  const [attemptCount, setAttemptCount] = useState(0)
  // Sync with server count when data arrives (don't override if an attempt is in progress)
  useEffect(() => {
    if (state.phase === 'idle' || state.phase === 'error') {
      setAttemptCount(serverAttemptCount)
    }
  }, [serverAttemptCount, state.phase])

  const startAttempt = useStartQuizAttempt()
  const submitAttempt = useSubmitQuizAttempt()

  const handleStart = useCallback(async () => {
    if (!user?.id || !tenantId) return
    // LQP-2 FIX: Prevent concurrent starts
    if (state.phase === 'loading') return
    // LQP-3 FIX: Enforce max attempts client-side
    if (maxAttempts > 0 && attemptCount >= maxAttempts) {
      addToast({ type: 'warning', message: 'Percobaan kuis sudah habis.' })
      return
    }

    setState({ phase: 'loading' })
    onStartViewing()

    try {
      const result = await startAttempt.mutateAsync({
        quizId,
      })

      // Load attempt questions (answers are embedded in QuizAttemptQuestion)
      const attemptQuestions = await quizPlayerService.getAttemptQuestions(result.attempt_id)

      // Extract saved answers from attempt questions for resume
      const initialAnswers: Record<string, SubmitAnswer> = {}
      for (const q of attemptQuestions) {
        if (q.selected_option_ids.length > 0 || q.text_answer) {
          initialAnswers[q.question_id] = {
            question_id: q.question_id,
            selected_option_ids: q.selected_option_ids,
            text_answer: q.text_answer ?? undefined,
          }
        }
      }

      const initialIndex = quizPlayerService.getCurrentQuestionIndex(
        attemptQuestions,
        initialAnswers
      )

      setAttemptCount((c) => c + 1)
      setState({
        phase: 'ready',
        attemptId: result.attempt_id,
        expiresAt: result.expires_at ?? null,
        questions: attemptQuestions,
        initialAnswers,
        initialIndex,
      })
    } catch (err: unknown) {
      captureError(err, { context: 'LessonQuizPlayer.startQuiz' })
      const message = err instanceof Error ? err.message : 'Gagal memulai kuis'
      setState({ phase: 'error', message })
    }
  }, [
    quizId,
    user?.id,
    tenantId,
    state.phase,
    maxAttempts,
    attemptCount,
    startAttempt,
    onStartViewing,
    addToast,
  ])

  const handleSubmit = useCallback(
    async (answers: Record<string, SubmitAnswer>) => {
      if (state.phase !== 'ready') return

      setIsSubmitting(true)
      try {
        const answerArray = Object.values(answers)
        const result = await submitAttempt.mutateAsync({
          attemptId: state.attemptId,
          answers: answerArray,
        })

        setState({
          phase: 'submitted',
          score: result.score ?? null,
          passed: result.passed ?? null,
        })

        if (result.passed) {
          onCompletionMet()
        }
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Submit failed:', err)
        addToast({
          type: 'error',
          message: 'Gagal mengirim jawaban. Periksa koneksi dan coba lagi.',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [state, submitAttempt, onCompletionMet, addToast]
  )

  const handleRetry = useCallback(() => {
    // LQP-2 FIX: Prevent double-click starts
    if (state.phase === 'loading') return
    setState({ phase: 'idle' })
    handleStart()
  }, [handleStart, state.phase])

  // Show completed state if already done
  // LQP-1 FIX: Don't override active attempt (ready/loading phase)
  useEffect(() => {
    if (state.phase === 'ready' || state.phase === 'loading') return
    if (isCompleted) {
      setState({ phase: 'submitted', score: null, passed: true })
    }
  }, [isCompleted, state.phase])

  const hasExhaustedAttempts = maxAttempts > 0 && attemptCount >= maxAttempts

  // ── Failed (not retried yet): prominent retry CTA ─────
  if (state.phase === 'submitted' && state.passed === false && !isCompleted) {
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <Play className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            {instructions && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{instructions}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {/* LQP-7 FIX: Use explicit null/zero check instead of falsy */}
            {timeLimitMinutes != null && timeLimitMinutes > 0 && (
              <span>⏱ {timeLimitMinutes} menit</span>
            )}
            <span>📝 Maks. {maxAttempts}x percobaan</span>
            <span>✅ Lulus: {passingScore}%</span>
          </div>

          {/* Failure state: show score, passing requirement, and clear retry CTA */}
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="font-semibold text-red-700 dark:text-red-300">
                Belum memenuhi nilai minimum
              </p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              Nilai kamu: <strong>{state.score !== null ? `${state.score}%` : '—'}</strong>. Nilai
              minimum: <strong>{passingScore}%</strong>.
            </p>
            {hasExhaustedAttempts ? (
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Percobaan sudah habis ({maxAttempts}x)
              </p>
            ) : (
              <button
                onClick={handleRetry}
                disabled={startAttempt.isPending}
                className="w-full min-h-[44px] px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
              >
                Coba Lagi
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Idle / Post-Submit (passed): Start screen ──────────
  if (state.phase === 'idle' || (state.phase === 'submitted' && !isCompleted)) {
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <Play className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            {instructions && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{instructions}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {/* LQP-7 FIX: Use explicit null/zero check instead of falsy */}
            {timeLimitMinutes != null && timeLimitMinutes > 0 && (
              <span>⏱ {timeLimitMinutes} menit</span>
            )}
            <span>📝 Maks. {maxAttempts}x percobaan</span>
            <span>✅ Lulus: {passingScore}%</span>
          </div>

          {state.phase === 'submitted' && state.passed && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                Selamat! Anda lulus kuis ini.
              </p>
              {state.score !== null && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  Skor: {state.score}%
                </p>
              )}
            </div>
          )}

          {/* LQP-4 FIX: Show appropriate CTA based on state */}
          {state.phase === 'submitted' && state.passed ? (
            // Already passed — show "Selesai" instead of "Coba Lagi"
            <div className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40">
              <CheckCircle className="w-4 h-4" />
              Selesai
            </div>
          ) : hasExhaustedAttempts ? (
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Percobaan sudah habis ({maxAttempts}x)
            </p>
          ) : (
            <button
              onClick={handleStart}
              disabled={startAttempt.isPending}
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/40 transition-all"
            >
              {state.phase === 'submitted' ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Coba Lagi
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Mulai Kuis
                </>
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────
  if (state.phase === 'loading') {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 dark:text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="font-medium">Menyiapkan kuis...</span>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <div className="px-6 py-8 max-w-lg mx-auto">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400 mx-auto" />
          <p className="font-bold text-red-700 dark:text-red-300">{state.message}</p>
          <button
            onClick={() => setState({ phase: 'idle' })}
            className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline"
          >
            Kembali
          </button>
        </div>
      </div>
    )
  }

  // ── Completed ─────────────────────────────────────────
  if (state.phase === 'submitted' && isCompleted) {
    return (
      <div className="px-6 py-8 max-w-lg mx-auto text-center">
        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">✅</span>
          </div>
          <p className="font-bold text-emerald-700 dark:text-emerald-300">
            Kuis telah diselesaikan
          </p>
        </div>
      </div>
    )
  }

  // ── Playing (QuizPlayer engine) ───────────────────────
  if (state.phase === 'ready') {
    return (
      <QuizPlayer
        attemptId={state.attemptId}
        expiresAt={state.expiresAt}
        quiz={{
          id: quizId,
          title,
          time_limit_minutes: timeLimitMinutes,
        }}
        attemptQuestions={state.questions}
        initialAnswers={state.initialAnswers}
        initialQuestionIndex={state.initialIndex}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    )
  }

  return null
}
