import { CheckCircle, HelpCircle, Loader2, Search, Trophy, Zap } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { AttemptDetailModal } from '@/src/components/AttemptDetailModal'
import { FeatureErrorBoundary } from '@/src/components/FeatureErrorBoundary'
import { useAuth } from '@/src/contexts/AuthContext'
import {
  type QuizAttempt,
  type QuizAttemptQuestion,
  type QuizAttemptResult,
  type StudentQuizAssignment,
  type SubmitAnswer,
} from '@/src/features/quizzes'
import { quizService } from '@/src/features/quizzes'
import { QuizSkeleton } from '@/src/features/quizzes/components/QuizSkeleton'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'
import { cn } from '@/src/utils/cn'
import { quizSubmitRateLimiter } from '@/src/utils/rateLimiter'

import {
  getAttemptQuestions,
  getCurrentQuestionIndex,
} from '../features/quizzes/api/quizPlayer.service'
import { QuizPlayer } from '../features/quizzes/components/player/QuizPlayer'
import { QuizAnswerReview } from '../features/quizzes/components/student/QuizAnswerReview'
import { QuizAttemptCard } from '../features/quizzes/components/student/QuizAttemptCard'
// Extracted Components
import { QuizCard } from '../features/quizzes/components/student/QuizCard'
import { QuizResultsView } from '../features/quizzes/components/student/QuizResultsView'
import { StartQuizModal } from '../features/quizzes/components/student/StartQuizModal'
import {
  useStartQuizAttempt,
  useSubmitQuizAttempt,
} from '../features/quizzes/queries/quizPlayer.mutations'
// React Query Hooks
import {
  useStudentQuizAssignments,
  useUserAttempts,
} from '../features/quizzes/queries/quizPlayer.queries'

export function QuizModule() {
  usePageTitle('Quiz Module')
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available')

  // React Query Data
  const {
    data: quizzes = [],
    isLoading: isLoadingQuizzes,
    refetch: refetchQuizzes,
  } = useStudentQuizAssignments(tenantId ?? undefined)
  const {
    data: quizAttempts = [],
    isLoading: isLoadingAttempts,
    refetch: refetchAttempts,
  } = useUserAttempts(tenantId ?? undefined)

  const isLoading = isLoadingQuizzes || isLoadingAttempts

  // Mutations
  const { mutateAsync: startAttemptMutation, isPending: isStarting } = useStartQuizAttempt()
  const { mutateAsync: submitAttemptMutation, isPending: isSubmitting } = useSubmitQuizAttempt()

  // Start Quiz Modal State
  const [pendingQuiz, setPendingQuiz] = useState<
    (StudentQuizAssignment & { isResume: boolean; activeAttempt?: QuizAttempt }) | null
  >(null)

  // Quiz Taking State
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null)
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [attemptVersion, setAttemptVersion] = useState<number | undefined>(undefined)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [attemptQuestions, setAttemptQuestions] = useState<QuizAttemptQuestion[]>([])
  const [initialAnswers, setInitialAnswers] = useState<Record<string, SubmitAnswer>>({})
  const [initialQuestionIndex, setInitialQuestionIndex] = useState<number>(0)

  // Results State
  const [showResults, setShowResults] = useState(false)
  const [quizResult, setQuizResult] = useState<QuizAttemptResult | null>(null)

  // Review Mode State
  const [reviewAttempt, setReviewAttempt] = useState<{
    attemptId: string
    studentName: string
    score: number | null
    passed: boolean | null
  } | null>(null)

  // Answer Review State
  const [showAnswerReview, setShowAnswerReview] = useState(false)
  const [gradedQuestions, setGradedQuestions] = useState<QuizAttemptQuestion[]>([])

  const completedAttempts = quizAttempts.filter(
    (attempt) => attempt.status === 'SUBMITTED' || attempt.status === 'GRADED'
  )

  // Compute total points from completed attempts
  const totalPoints = useMemo(() => {
    return completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0)
  }, [completedAttempts])

  const filteredQuizzes = quizzes.filter((quiz) => {
    if (quiz.status === 'draft') return false
    const matchesSearch = quiz.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClass = selectedClass === 'all' || quiz.class_name === selectedClass
    return matchesSearch && matchesClass
  })

  const classes = [...new Set(quizzes.map((q) => q.class_name || 'Umum'))]

  const refreshQuizData = async () => {
    await Promise.all([refetchQuizzes(), refetchAttempts()])
  }

  const recoverAnswers = (questions: QuizAttemptQuestion[]) => {
    const recovered: Record<string, SubmitAnswer> = {}
    questions.forEach((q) => {
      if (q.selected_option_ids?.length > 0 || q.text_answer) {
        recovered[q.question_id] = {
          question_id: q.question_id,
          selected_option_ids: q.selected_option_ids || [],
          text_answer: q.text_answer || undefined,
        }
      }
    })
    return recovered
  }

  // Handle auto-open if quizId is in search params
  useEffect(() => {
    const targetQuizId = searchParams.get('quizId')
    if (targetQuizId && quizzes.length > 0 && !isQuizActive && !showResults && !pendingQuiz) {
      const quiz = quizzes.find((q) => q.id === targetQuizId)
      if (quiz) {
        const activeAttempt = quizAttempts.find(
          (a) => a.quiz_id === targetQuizId && a.status === 'IN_PROGRESS'
        )
        setPendingQuiz({ ...quiz, isResume: !!activeAttempt, activeAttempt })
        // Clear the search param so it doesn't trigger again on refresh
        setSearchParams(
          (prev) => {
            prev.delete('quizId')
            return prev
          },
          { replace: true }
        )
      }
    }
  }, [searchParams, quizzes, quizAttempts, isQuizActive, showResults, pendingQuiz, setSearchParams])

  const handleStartOrResume = async (
    quiz: StudentQuizAssignment & { isResume?: boolean; activeAttempt?: QuizAttempt }
  ) => {
    try {
      setCurrentQuizId(quiz.id)
      setIsLoadingQuestions(true)
      let attemptId = quiz.activeAttempt?.id
      let version = quiz.activeAttempt?.version
      let expiredAt = quiz.activeAttempt?.expires_at

      if (!quiz.isResume) {
        const startData = await startAttemptMutation({
          quizId: quiz.quiz_id,
          assignmentId: quiz.assignment_id,
        })
        attemptId = startData.attempt_id
        version = startData.version
        expiredAt = startData.expires_at
      }

      setCurrentAttemptId(attemptId ?? null)
      setAttemptVersion(version)
      setExpiresAt(expiredAt ?? null)

      if (!attemptId) throw new Error('No attempt ID available')
      const questions = await quizService.getAttemptQuestions(attemptId)
      setAttemptQuestions(questions)

      // Resume at the first unanswered question (computed from frontend data)
      const recoveredAnswers = recoverAnswers(questions)
      const resumeIdx = quiz.isResume ? getCurrentQuestionIndex(questions, recoveredAnswers) : 0
      setInitialQuestionIndex(resumeIdx)

      if (expiredAt && new Date(expiredAt) < new Date()) {
        setIsLoadingQuestions(false)
        addToast({
          type: 'warning',
          message:
            'Waktu habis! Kuis Anda telah ditandai sebagai kedaluwarsa dan akan disubmit otomatis.',
        })
        const formattedAnswers = Object.values(recoverAnswers(questions)) as SubmitAnswer[]
        const result = await submitAttemptMutation({
          attemptId,
          answers: formattedAnswers,
          version,
        })
        setQuizResult(result)
        await refreshQuizData()
        setIsQuizActive(false)
        setShowResults(true)
        setPendingQuiz(null)
        return
      }

      setInitialAnswers(recoveredAnswers)
      setIsQuizActive(true)
      setShowResults(false)
      setPendingQuiz(null)
      setIsLoadingQuestions(false)
    } catch (err: unknown) {
      setIsLoadingQuestions(false)
      if (import.meta.env.DEV) console.error('Failed to start/resume', err)
      const message = err instanceof Error ? err.message : ''
      if (message.includes('not enrolled'))
        addToast({
          type: 'error',
          message: 'Anda tidak terdaftar di kelas untuk assignment kuis ini.',
        })
      else if (message.includes('not yet available'))
        addToast({ type: 'warning', message: 'Kuis ini belum dibuka.' })
      else if (message.includes('no longer available'))
        addToast({ type: 'warning', message: 'Waktu akses kuis ini sudah berakhir.' })
      else addToast({ type: 'error', message: message || 'Gagal memulai kuis.' })
    }
  }

  const handleSubmitQuiz = async (finalAnswers: Record<string, SubmitAnswer>) => {
    const quiz = quizzes.find((q) => q.id === currentQuizId)
    if (!quiz || !currentAttemptId) return

    const { allowed, retryAfterMs } = quizSubmitRateLimiter.check(currentAttemptId)
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      addToast({
        type: 'warning',
        message: `Terlalu banyak percobaan. Silakan coba lagi dalam ${seconds} detik.`,
      })
      return
    }

    try {
      const formattedAnswers = Object.values(finalAnswers) as SubmitAnswer[]
      const result = await submitAttemptMutation({
        attemptId: currentAttemptId,
        answers: formattedAnswers,
        version: attemptVersion,
      })
      setQuizResult(result)
      await refreshQuizData()

      setIsQuizActive(false)
      setShowResults(true)
      setShowAnswerReview(false)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Gagal mengirim kuis', err)
      const message = err instanceof Error ? err.message : ''
      if (message.includes('Time limit exceeded')) {
        addToast({
          type: 'warning',
          message: 'Waktu habis! Kuis Anda telah ditandai sebagai kedaluwarsa.',
        })
        setIsQuizActive(false)
        refreshQuizData()
      } else if (message.includes('ATTEMPT_VERSION_CONFLICT')) {
        addToast({
          type: 'warning',
          message:
            'Kuis ini baru saja disubmit dari tempat lain (tab/perangkat lain). Memuat ulang...',
        })
        setIsQuizActive(false)
        refreshQuizData()
      } else {
        addToast({ type: 'error', message: 'Gagal mengirim kuis. Silakan coba lagi.' })
      }
    }
  }

  const currentQuiz = quizzes.find((q) => q.id === currentQuizId)

  if (isLoading) {
    return <QuizSkeleton />
  }

  if (isLoadingQuestions) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">Memuat soal kuis...</p>
        </div>
      </div>
    )
  }

  if (isQuizActive && currentQuiz) {
    if (!attemptQuestions || attemptQuestions.length === 0) {
      return (
        <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Kuis Belum Memiliki Soal
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Kuis ini belum memiliki soal yang dapat dikerjakan. Silakan hubungi pengajar Anda.
            </p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              onClick={() => {
                setIsQuizActive(false)
                setShowResults(false)
              }}
            >
              Kembali
            </button>
          </div>
        </div>
      )
    }

    return (
      <FeatureErrorBoundary featureName="Quiz">
        <QuizPlayer
          attemptId={currentAttemptId!}
          expiresAt={expiresAt}
          quiz={{ ...currentQuiz, time_limit_minutes: currentQuiz.time_limit_minutes ?? undefined }}
          attemptQuestions={attemptQuestions}
          initialAnswers={initialAnswers}
          initialQuestionIndex={initialQuestionIndex}
          isSubmitting={isSubmitting}
          onSubmit={() => handleSubmitQuiz(initialAnswers)}
        />
      </FeatureErrorBoundary>
    )
  }

  // Handle viewing answer review
  const handleViewAnswers = async () => {
    if (!currentAttemptId) return
    try {
      const questions = await getAttemptQuestions(currentAttemptId)
      setGradedQuestions(questions)
      setShowAnswerReview(true)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load graded questions:', err)
      addToast({ type: 'error', message: 'Gagal memuat review jawaban. Silakan coba lagi.' })
    } finally {
    }
  }

  if (showAnswerReview && gradedQuestions.length > 0 && currentQuiz) {
    return (
      <QuizAnswerReview
        questions={gradedQuestions}
        showCorrectAnswers={currentQuiz.show_correct_answers ?? false}
        onBack={() => setShowAnswerReview(false)}
      />
    )
  }

  if (showResults && quizResult && currentQuiz) {
    const attemptsUsedForQuiz = quizAttempts.filter(
      (a) =>
        a.quiz_id === currentQuiz.quiz_id && (a.status === 'SUBMITTED' || a.status === 'GRADED')
    ).length
    return (
      <QuizResultsView
        result={quizResult}
        quiz={currentQuiz}
        onRetry={() => handleStartOrResume({ ...currentQuiz, isResume: false })}
        onClose={() => {
          setShowResults(false)
          setCurrentQuizId(null)
        }}
        onViewAnswers={currentQuiz.show_correct_answers ? handleViewAnswers : undefined}
        passingScore={currentQuiz.passing_score ?? undefined}
        maxAttempts={currentQuiz.max_attempts ?? undefined}
        attemptsUsed={attemptsUsedForQuiz}
      />
    )
  }

  return (
    <div className="flex-1 space-y-6">
      <AnimatePresence>
        {pendingQuiz && (
          <StartQuizModal
            pendingQuiz={pendingQuiz}
            isStarting={isStarting}
            onClose={() => setPendingQuiz(null)}
            onStart={handleStartOrResume}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Kuis & Evaluasi
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Uji pemahaman Anda dengan kuis interaktif
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {quizzes.length}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Kuis
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {completedAttempts.length}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Selesai
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {completedAttempts.length > 0
                ? Math.round(
                    completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) /
                      completedAttempts.length
                  )
                : 0}
              %
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rata-rata
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalPoints}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Poin Total
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kuis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari kuis"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('available')}
          className={cn(
            'px-4 py-2 font-bold text-sm border-b-2 transition-colors',
            activeTab === 'available'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          Tersedia
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            'px-4 py-2 font-bold text-sm border-b-2 transition-colors',
            activeTab === 'completed'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          Selesai
        </button>
      </div>

      {activeTab === 'available' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map((quiz) => {
              const activeAttempt = quizAttempts.find(
                (a) => a.assignment_id === quiz.assignment_id && a.status === 'IN_PROGRESS'
              )
              const attemptsCount = quizAttempts.filter(
                (a) => a.assignment_id === quiz.assignment_id
              ).length

              return (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  activeAttempt={activeAttempt}
                  attemptsCount={attemptsCount}
                  onStart={() =>
                    setPendingQuiz({ ...quiz, isResume: !!activeAttempt, activeAttempt })
                  }
                  isStarting={isStarting && currentQuizId === quiz.id}
                />
              )
            })
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10 text-slate-500 dark:text-slate-400">
              Belum ada kuis yang tersedia.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {completedAttempts.length > 0 ? (
            completedAttempts.map((attempt) => (
              <QuizAttemptCard
                key={attempt.id}
                attempt={attempt}
                onReview={() =>
                  setReviewAttempt({
                    attemptId: attempt.id,
                    studentName: 'Anda',
                    score: attempt.score,
                    passed: attempt.passed,
                  })
                }
              />
            ))
          ) : (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              Anda belum menyelesaikan kuis apapun.
            </div>
          )}
        </div>
      )}

      {reviewAttempt && (
        <AttemptDetailModal
          attemptId={reviewAttempt.attemptId}
          studentName={reviewAttempt.studentName}
          score={reviewAttempt.score}
          passed={reviewAttempt.passed}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </div>
  )
}
