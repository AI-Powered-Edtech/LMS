import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { AssignmentResultRow, quizService } from '@/src/features/quizzes'
import {
  QuestionDifficulty,
  quizAnalyticsService,
} from '@/src/features/quizzes/api/quizAnalyticsService'
import { usePageTitle } from '@/src/hooks/usePageTitle'

export interface AssignmentOption {
  id: string
  title: string
  quiz_id: string
  passing_score: number
  max_attempts: number | null
}

export interface ClassOption {
  id: string
  name: string
}

export function useQuizGradebookState() {
  usePageTitle('Buku Nilai Kuis')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [assignments, setAssignments] = useState<AssignmentOption[]>([])
  const [attempts, setAttempts] = useState<AssignmentResultRow[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAssignmentLoading, setIsAssignmentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [selectedPassed, setSelectedPassed] = useState<boolean | null>(null)

  const [questionDifficulty, setQuestionDifficulty] = useState<QuestionDifficulty[]>([])
  const [isDifficultyLoading, setIsDifficultyLoading] = useState(false)

  const { activeTenant, user } = useAuth()

  useEffect(() => {
    async function loadClasses() {
      if (!user || !activeTenant) return

      try {
        const data = await quizService.getTeacherClasses(user.id, activeTenant.id)
        setClasses(data)
      } catch {
        if (import.meta.env.DEV) console.error('[useQuizGradebookState] Failed to load classes')
      }
    }

    loadClasses()
  }, [activeTenant, user])

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!selectedClass || !activeTenant) {
      setAssignments([])
      setSelectedAssignment('')
      return
    }

    async function loadAssignments() {
      setIsAssignmentLoading(true)
      try {
        const mappedAssignments = await quizService.getClassQuizAssignments(
          selectedClass,
          activeTenant!.id
        )
        setAssignments(mappedAssignments)
        setSelectedAssignment('')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat assignment kuis')
      } finally {
        setIsAssignmentLoading(false)
      }
    }

    loadAssignments()
  }, [selectedClass])
  /* eslint-enable react-hooks/exhaustive-deps */

  /* eslint-disable react-hooks/exhaustive-deps */
  const loadAttempts = useCallback(async () => {
    if (!selectedAssignment) {
      setAttempts([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await quizService.getAssignmentResults(selectedAssignment, activeTenant!.id)
      setAttempts(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat hasil assignment')
    } finally {
      setIsLoading(false)
    }
  }, [selectedAssignment])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    loadAttempts()
  }, [loadAttempts])

  useEffect(() => {
    if (!selectedAssignment) {
      setQuestionDifficulty([])
      return
    }

    async function loadDifficulty() {
      setIsDifficultyLoading(true)
      try {
        const data = await quizAnalyticsService.getQuestionDifficulty(selectedAssignment)
        setQuestionDifficulty(data)
      } catch {
        if (import.meta.env.DEV) console.error('Failed to load question difficulty')
      } finally {
        setIsDifficultyLoading(false)
      }
    }

    loadDifficulty()
  }, [selectedAssignment, attempts])

  const handleOpenAttemptDetail = useCallback((attempt: AssignmentResultRow) => {
    setSelectedAttemptId(attempt.attempt_id)
    setSelectedStudentName(attempt.student_name || 'Siswa')
    setSelectedScore(attempt.score)
    setSelectedPassed(attempt.passed)
  }, [])

  const filteredAttempts = useMemo(
    () =>
      attempts.filter((attempt) =>
        attempt.student_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [attempts, searchQuery]
  )

  const { avgScore, passCount, failCount } = useMemo(() => {
    // ⚡ Perf: consolidate multiple array traversals into a single pass to reduce O(N) operations.
    let totalScore = 0
    let scoredCount = 0
    let passCount = 0
    let failCount = 0

    for (let i = 0; i < filteredAttempts.length; i++) {
      const attempt = filteredAttempts[i]
      if (attempt.score !== null) {
        totalScore += attempt.score
        scoredCount++
      }
      if (attempt.passed === true) passCount++
      else if (attempt.passed === false) failCount++
    }

    return {
      avgScore: scoredCount ? Math.round(totalScore / scoredCount) : 0,
      passCount,
      failCount,
    }
  }, [filteredAttempts])

  const selectedAssignmentInfo = assignments.find(
    (assignment) => assignment.id === selectedAssignment
  )
  const passingScore = selectedAssignmentInfo?.passing_score ?? 70

  const handleExportCSV = () => {
    const csv = quizAnalyticsService.exportGradebookCSV(
      filteredAttempts.map((attempt) => ({
        profiles: { full_name: attempt.student_name },
        quizzes: { title: attempt.quiz_title },
        score: attempt.score,
        passed: attempt.passed,
        time_spent: attempt.time_spent,
        submitted_at: attempt.submitted_at,
      }))
    )
    const assignmentTitle = selectedAssignmentInfo?.title || 'gradebook'
    quizAnalyticsService.downloadCSV(csv, `gradebook_${assignmentTitle.replace(/\s+/g, '_')}.csv`)
  }

  const handleCloseAttemptDetail = () => {
    setSelectedAttemptId(null)
    loadAttempts()
  }

  return {
    // Data
    classes,
    assignments,
    filteredAttempts,
    selectedClass,
    selectedAssignment,
    selectedAssignmentInfo,
    searchQuery,
    passingScore,
    questionDifficulty,

    // Stats
    avgScore,
    passCount,
    failCount,

    // Loading states
    isLoading,
    isAssignmentLoading,
    isDifficultyLoading,
    error,

    // Attempt detail modal
    selectedAttemptId,
    selectedStudentName,
    selectedScore,
    selectedPassed,

    // Actions
    setSelectedClass,
    setSelectedAssignment,
    setSearchQuery,
    handleOpenAttemptDetail,
    handleCloseAttemptDetail,
    handleExportCSV,
    loadAttempts,
  }
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export function getScoreColor(score: number | null, passing: number) {
  if (score === null) return 'text-slate-400'
  if (score >= passing) return 'text-emerald-600 font-bold'
  if (score >= passing * 0.7) return 'text-amber-600 font-bold'
  return 'text-red-600 font-bold'
}

export function getScoreBg(score: number | null, passing: number) {
  if (score === null) return 'bg-slate-50'
  if (score >= passing) return 'bg-emerald-50'
  if (score >= passing * 0.7) return 'bg-amber-50'
  return 'bg-red-50'
}
