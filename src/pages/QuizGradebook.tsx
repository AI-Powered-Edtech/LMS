import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ChevronDown,
  Loader2,
  Download,
  BarChart3,
  Eye,
  PenLine,
} from 'lucide-react'
import { supabase } from '@/src/lib/supabase'
import { cn } from '@/src/utils/cn'
import { AttemptDetailModal } from '@/src/components/AttemptDetailModal'
import {
  quizAnalyticsService,
  QuestionDifficulty,
} from '@/src/features/quizzes/api/quizAnalyticsService'
import { quizService, AssignmentResultRow } from '@/src/features/quizzes'
import { useAuth } from '@/src/contexts/AuthContext'
import { VirtualTable } from '@/src/components/ui/VirtualTable'

interface AssignmentOption {
  id: string
  title: string
  quiz_id: string
  passing_score: number
  max_attempts: number | null
}

interface ClassOption {
  id: string
  name: string
}

export function QuizGradebook() {
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

  const { activeTenant } = useAuth()

  useEffect(() => {
    async function loadClasses() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || !activeTenant) return

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id)
        .eq('tenant_id', activeTenant.id)
        .order('name', { ascending: true })

      if (!error && data) setClasses(data)
    }

    loadClasses()
  }, [activeTenant])

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
        const { data, error } = await supabase
          .from('quiz_assignments')
          .select(
            `
                        id,
                        quiz_id,
                        max_attempts,
                        quizzes!inner (
                            id,
                            title,
                            passing_score,
                            max_attempts,
                            status
                        )
                    `
          )
          .eq('class_id', selectedClass)
          .eq('tenant_id', activeTenant!.id)
          .eq('quizzes.status', 'published')
          .order('created_at', { ascending: false })

        if (error) throw error

        const mappedAssignments = (data || []).map((assignment) => {
          const quiz = Array.isArray(assignment.quizzes)
            ? assignment.quizzes[0]
            : assignment.quizzes
          return {
            id: assignment.id,
            quiz_id: assignment.quiz_id,
            title: quiz?.title || 'Kuis',
            passing_score: quiz?.passing_score || 70,
            max_attempts: assignment.max_attempts ?? quiz?.max_attempts ?? null,
          }
        })

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
        console.error('Failed to load question difficulty')
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

  const filteredAttempts = useMemo(
    () =>
      attempts.filter((attempt) =>
        attempt.student_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [attempts, searchQuery]
  )

  const { avgScore, passCount, failCount } = useMemo(() => {
    const scoredAttempts = filteredAttempts.filter((attempt) => attempt.score !== null)
    return {
      avgScore: scoredAttempts.length
        ? Math.round(
            scoredAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
              scoredAttempts.length
          )
        : 0,
      passCount: filteredAttempts.filter((attempt) => attempt.passed).length,
      failCount: filteredAttempts.filter((attempt) => attempt.passed === false).length,
    }
  }, [filteredAttempts])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getScoreColor = (score: number | null, passing: number) => {
    if (score === null) return 'text-slate-400'
    if (score >= passing) return 'text-emerald-600 font-bold'
    if (score >= passing * 0.7) return 'text-amber-600 font-bold'
    return 'text-red-600 font-bold'
  }

  const getScoreBg = (score: number | null, passing: number) => {
    if (score === null) return 'bg-slate-50'
    if (score >= passing) return 'bg-emerald-50'
    if (score >= passing * 0.7) return 'bg-amber-50'
    return 'bg-red-50'
  }

  const selectedAssignmentInfo = assignments.find(
    (assignment) => assignment.id === selectedAssignment
  )
  const passingScore = selectedAssignmentInfo?.passing_score ?? 70

  const attemptColumns = useMemo(() => [
    {
      key: 'student_name',
      header: 'Siswa',
      render: (attempt: AssignmentResultRow) => (
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => handleOpenAttemptDetail(attempt)}
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${attempt.student_name}`}
              alt=""
            />
          </div>
          <span className="font-semibold text-slate-800 text-sm">
            {attempt.student_name || 'Siswa'}
          </span>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Skor',
      render: (attempt: AssignmentResultRow) => (
        <div className="flex justify-center">
          <span
            className={cn(
              'inline-flex items-center justify-center w-14 h-8 rounded-lg text-sm',
              getScoreBg(attempt.score, passingScore),
              getScoreColor(attempt.score, passingScore)
            )}
          >
            {attempt.score ?? '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (attempt: AssignmentResultRow) => (
        <div className="flex flex-col items-center gap-1">
          {attempt.passed === true ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-3 h-3" /> Lulus
            </span>
          ) : attempt.passed === false ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              <XCircle className="w-3 h-3" /> Tidak Lulus
            </span>
          ) : (
            <span className="text-xs text-slate-400">Belum dinilai</span>
          )}
          {attempt.status === 'submitted' && attempt.passed === null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
              <PenLine className="w-2.5 h-2.5" />
              Perlu Dinilai
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'time_spent',
      header: 'Waktu',
      render: (attempt: AssignmentResultRow) => (
        <div className="flex justify-center text-sm text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formatDuration(attempt.time_spent)}
          </span>
        </div>
      ),
    },
    {
      key: 'submitted_at',
      header: 'Diserahkan',
      render: (attempt: AssignmentResultRow) => (
        <div className="text-center text-sm text-slate-500">
          {attempt.submitted_at
            ? new Date(attempt.submitted_at).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (attempt: AssignmentResultRow) => (
        <div className="flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleOpenAttemptDetail(attempt)
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Detail
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [passingScore, handleOpenAttemptDetail])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Link
              to="/teacher-dashboard"
              className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            Quiz Gradebook
          </h1>
          <p className="text-slate-500 mt-1 ml-9 text-sm">Rekap nilai assignment kuis per kelas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!selectedAssignment || filteredAttempts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadAttempts}
            disabled={!selectedAssignment || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Pilih Kelas
          </label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm pr-10"
            >
              <option value="">-- Pilih kelas --</option>
              {classes.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Pilih Assignment
          </label>
          <div className="relative">
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              disabled={!selectedClass || isAssignmentLoading || assignments.length === 0}
              className="w-full appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm pr-10 disabled:opacity-50"
            >
              <option value="">-- Pilih assignment kuis --</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {selectedAssignment && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Rata-rata Skor',
              value: `${avgScore}`,
              sub: 'dari 100',
              icon: <TrendingUp className="w-4 h-4" />,
              color: 'bg-blue-50 text-blue-600',
            },
            {
              label: 'Total Percobaan',
              value: `${filteredAttempts.length}`,
              sub: 'attempt',
              icon: <HelpCircle className="w-4 h-4" />,
              color: 'bg-purple-50 text-purple-600',
            },
            {
              label: 'Lulus',
              value: `${passCount}`,
              sub: `${filteredAttempts.length > 0 ? Math.round((passCount / filteredAttempts.length) * 100) : 0}% pass rate`,
              icon: <CheckCircle2 className="w-4 h-4" />,
              color: 'bg-emerald-50 text-emerald-600',
            },
            {
              label: 'Tidak Lulus',
              value: `${failCount}`,
              sub: `nilai < ${passingScore}`,
              icon: <XCircle className="w-4 h-4" />,
              color: 'bg-red-50 text-red-600',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 font-medium text-xs sm:text-sm">{stat.label}</span>
                <div
                  className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.color)}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {selectedAssignmentInfo && (
            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full shrink-0">
              {selectedAssignmentInfo.title}
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">{error}</div>
        )}

        {!selectedAssignment ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium text-slate-500">Pilih kelas dan assignment</p>
            <p className="text-sm mt-1">untuk melihat rekap nilai siswa.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Clock className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium text-slate-500">Belum ada percobaan</p>
            <p className="text-sm mt-1">Siswa belum mengerjakan assignment kuis ini.</p>
          </div>
        ) : (
          <VirtualTable<AssignmentResultRow>
            data={filteredAttempts}
            columns={attemptColumns}
            rowHeight={52}
            maxHeight={550}
            getRowKey={(attempt) => attempt.attempt_id ?? String(attempt.student_id)}
          />
        )}
      </div>

      {selectedAssignment && questionDifficulty.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800">Tingkat Kesulitan Soal</h3>
            <span className="text-xs text-slate-400 ml-auto">% siswa menjawab benar</span>
          </div>
          {isDifficultyLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Memuat...</span>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {questionDifficulty.map((question, index) => {
                const percent = question.difficulty_percent ?? 0
                const barColor =
                  percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                const labelColor =
                  percent >= 70
                    ? 'text-emerald-600'
                    : percent >= 40
                      ? 'text-amber-600'
                      : 'text-red-600'
                const label = percent >= 70 ? 'Mudah' : percent >= 40 ? 'Sedang' : 'Sulit'

                return (
                  <div key={question.question_id} className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                      {index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate mb-1">
                        {question.question_text}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', barColor)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span
                          className={cn('text-xs font-bold w-16 text-right shrink-0', labelColor)}
                        >
                          {percent}%{' '}
                          <span className="font-normal text-slate-400 text-[10px]">{label}</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {question.correct_count} / {question.total_attempts} siswa benar
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedAttemptId && (
        <AttemptDetailModal
          attemptId={selectedAttemptId}
          studentName={selectedStudentName}
          score={selectedScore}
          passed={selectedPassed}
          onClose={() => {
            setSelectedAttemptId(null)
            // Refresh attempts to reflect any grading changes
            loadAttempts()
          }}
          onGraded={loadAttempts}
        />
      )}
    </div>
  )
}
