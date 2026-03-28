// Bridge component: connects BlockRenderer quiz data → QuizPlayer (new engine)
// Handles attempt lifecycle (start/resume) and delegates to QuizPlayer

import { AlertTriangle, CheckCircle, Clock, FileText, Loader2, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import * as quizPlayerService from '@/src/features/quizzes/api/quizPlayer.service'
import { QuizPlayer } from '@/src/features/quizzes/components/player/QuizPlayer'
import {
  useStartQuizAttempt,
  useSubmitQuizAttempt,
} from '@/src/features/quizzes/queries/quizPlayer.mutations'
import type { QuizAttemptQuestion, SubmitAnswer } from '@/src/features/quizzes/types/quizzes.types'

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
  const [state, setState] = useState<PlayerState>({ phase: 'idle' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const startAttempt = useStartQuizAttempt()
  const submitAttempt = useSubmitQuizAttempt()

  const handleStart = useCallback(async () => {
    if (!user?.id || !tenantId) return

    setState({ phase: 'loading' })
    onStartViewing()

    try {
      const result = await startAttempt.mutateAsync({
        quizId,
      })

      // Load attempt questions; recover saved answers from embedded student_answers fields
      const attemptQuestions = await quizPlayerService.getAttemptQuestions(result.attempt_id)

      const initialAnswers: Record<string, SubmitAnswer> = {}
      for (const q of attemptQuestions) {
        if (q.selected_option_ids?.length > 0 || q.text_answer) {
          initialAnswers[q.question_id] = {
            question_id: q.question_id,
            selected_option_ids: q.selected_option_ids || [],
            text_answer: q.text_answer || undefined,
          }
        }
      }

      const initialIndex = quizPlayerService.getCurrentQuestionIndex(
        attemptQuestions,
        initialAnswers
      )

      setState({
        phase: 'ready',
        attemptId: result.attempt_id,
        expiresAt: result.expires_at ?? null,
        questions: attemptQuestions,
        initialAnswers,
        initialIndex,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memulai kuis'
      setState({ phase: 'error', message })
    }
  }, [quizId, user?.id, tenantId, startAttempt, onStartViewing])

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
      } finally {
        setIsSubmitting(false)
      }
    },
    [state, submitAttempt, onCompletionMet]
  )

  // Show completed state if already done
  useEffect(() => {
    if (isCompleted) {
      setState({ phase: 'submitted', score: null, passed: true })
    }
  }, [isCompleted])

  // ── Idle / Post-Submit: Start screen ──────────────────
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
            {timeLimitMinutes && (
              <span>
                <Clock className="inline h-4 w-4 mr-1" />
                {timeLimitMinutes} menit
              </span>
            )}
            <span>
              <FileText className="inline h-4 w-4 mr-1" />
              Maks. {maxAttempts}x percobaan
            </span>
            <span>
              <CheckCircle className="inline h-4 w-4 mr-1" />
              Lulus: {passingScore}%
            </span>
          </div>

          {state.phase === 'submitted' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                {state.passed ? 'Selamat! Anda lulus kuis ini.' : 'Belum lulus. Coba lagi?'}
              </p>
              {state.score !== null && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  Skor: {state.score}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/40 transition-all"
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
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
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
