import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import {
  type QuizAttempt,
  type QuizAttemptQuestion,
  type QuizAttemptResult,
  quizService,
  type StudentQuizAssignment,
  type SubmitAnswer,
} from '@/features/quizzes'
import {
  getAttemptQuestions,
  getCurrentQuestionIndex,
} from '@/features/quizzes/api/quizPlayer.service'
import {
  useStartQuizAttempt,
  useSubmitQuizAttempt,
} from '@/features/quizzes/queries/quizPlayer.mutations'
import {
  useStudentQuizAssignments,
  useUserAttempts,
} from '@/features/quizzes/queries/quizPlayer.queries'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'
import { cacheQuiz } from '@/utils/offlineStorage'
import { quizSubmitRateLimiter } from '@/utils/rateLimiter'
import { captureError } from '@/utils/sentry'

export function useQuizPageState() {
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

  const debouncedSearch = useDebounce(searchQuery, 300)

  const completedAttempts = useMemo(
    () =>
      quizAttempts.filter(
        (attempt) => attempt.status === 'SUBMITTED' || attempt.status === 'GRADED'
      ),
    [quizAttempts]
  )

  const totalPoints = useMemo(() => {
    return completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0)
  }, [completedAttempts])

  const filteredQuizzes = useMemo(
    () =>
      quizzes.filter((quiz) => {
        if (quiz.status === 'draft') return false
        const matchesSearch = quiz.title?.toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchesClass = selectedClass === 'all' || quiz.class_name === selectedClass
        return matchesSearch && matchesClass
      }),
    [quizzes, debouncedSearch, selectedClass]
  )

  const classes = useMemo(() => [...new Set(quizzes.map((q) => q.class_name || 'Umum'))], [quizzes])

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

      try {
        await cacheQuiz({
          quizId: quiz.quiz_id,
          questions: questions.map((q) => ({
            ...q,
            type:
              q.question_type === 'MCQ'
                ? 'multiple_choice'
                : q.question_type === 'TRUE_FALSE'
                  ? 'true_false'
                  : 'essay',
            order: q.order_index || 0,
          })),
          options: [],
          cachedAt: Date.now(),
          version: 1,
        })
      } catch (err) {
        // IndexedDB caching failure is non-critical — continue
        if (import.meta.env.DEV)
          console.warn('[useQuizPageState] IndexedDB quiz cache write failed:', err)
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
      captureError(err, { context: 'useQuizPageState.handleSubmit', attemptId: currentAttemptId })
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

  const handleViewAnswers = async () => {
    if (!currentAttemptId) return
    try {
      const questions = await getAttemptQuestions(currentAttemptId)
      setGradedQuestions(questions)
      setShowAnswerReview(true)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load graded questions:', err)
      addToast({ type: 'error', message: 'Gagal memuat review jawaban. Silakan coba lagi.' })
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    selectedClass,
    setSelectedClass,
    activeTab,
    setActiveTab,
    quizzes,
    quizAttempts,
    isLoading,
    isStarting,
    isSubmitting,
    pendingQuiz,
    setPendingQuiz,
    isQuizActive,
    setIsQuizActive,
    isLoadingQuestions,
    currentQuizId,
    setCurrentQuizId,
    currentAttemptId,
    expiresAt,
    attemptQuestions,
    initialAnswers,
    initialQuestionIndex,
    showResults,
    setShowResults,
    quizResult,
    reviewAttempt,
    setReviewAttempt,
    showAnswerReview,
    setShowAnswerReview,
    gradedQuestions,
    completedAttempts,
    totalPoints,
    filteredQuizzes,
    classes,
    currentQuiz,
    handleStartOrResume,
    handleSubmitQuiz,
    handleViewAnswers,
  }
}
