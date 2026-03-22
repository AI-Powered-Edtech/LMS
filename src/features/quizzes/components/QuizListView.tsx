import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  HelpCircle,
  Clock,
  Pencil,
  Globe,
  Lock,
  Copy,
  Link as LinkIcon,
  Users,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { type QuizMode } from '@/src/features/quizzes'
import { QuizAssignModal } from '@/src/features/quizzes/components/QuizAssignModal'
import { QuizAssignmentStatus } from '@/src/features/quizzes/components/QuizAssignmentStatus'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type QuizStatus = 'draft' | 'published' | 'archived'

interface QuizListItem {
  id: string
  title: string
  status: QuizStatus
  mode: QuizMode
  time_limit_minutes: number | null
  max_attempts: number
  passing_score: number
  question_count: number
  assignment_count?: number
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const modeLabels: Record<string, string> = {
  practice: 'Latihan',
  graded: 'Penilaian',
  exam: 'Ujian',
}

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────

export interface QuizListViewProps {
  quizzes: QuizListItem[]
  isLoading: boolean
  error: string | null
  activeTab: 'class' | 'library'
  setActiveTab: (tab: 'class' | 'library') => void
  expandedQuizId: string | null
  setExpandedQuizId: (id: string | null) => void
  activeClass: { id: string; name: string; join_code: string } | undefined
  studentCount: number
  assignModalQuizId: string | null
  setAssignModalQuizId: (id: string | null) => void
  openNewQuiz: () => void
  openEditQuiz: (quizId: string) => void
  handleDelete: (quizId: string) => void
  loadQuizzes: () => void
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function QuizListView({
  quizzes,
  isLoading,
  error,
  activeTab,
  setActiveTab,
  expandedQuizId,
  setExpandedQuizId,
  activeClass,
  studentCount,
  assignModalQuizId,
  setAssignModalQuizId,
  openNewQuiz,
  openEditQuiz,
  handleDelete,
  loadQuizzes,
}: QuizListViewProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Link
              to="/teacher-dashboard"
              className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            Manajemen Kuis
          </h1>
          <p className="text-slate-500 mt-1 ml-9 text-sm">
            Buat, kelola, dan publish kuis untuk kelas Anda
          </p>
        </div>
        <button
          onClick={openNewQuiz}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Buat Kuis Baru
        </button>
      </div>

      {/* Class Join Code Header */}
      {activeClass && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">
              Class
            </p>
            <h2 className="text-lg font-bold text-indigo-950">{activeClass.name}</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 bg-white py-3 px-4 rounded-xl border border-indigo-100/50">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Students</p>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                <p className="text-xl font-black text-slate-800">{studentCount}</p>
              </div>
            </div>
            <div className="h-full w-px bg-slate-100 hidden sm:block"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Join Code</p>
              <p className="text-xl font-black text-slate-800 tracking-widest">
                {activeClass.join_code}
              </p>
            </div>
            <div className="h-full w-px bg-slate-100 hidden sm:block"></div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeClass.join_code)
                  alert('Kode berhasil disalin!')
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Code
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/dashboard?join=${activeClass.join_code}`
                  navigator.clipboard.writeText(url)
                  alert('Link berhasil disalin!')
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('class')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all',
            activeTab === 'class'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          )}
        >
          Kuis Kelas Ini
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all',
            activeTab === 'library'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          )}
        >
          Semua Kuis (Bank Kuis)
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Quiz Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 animate-pulse"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-1/3" />
                </div>
                <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-14" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-14" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <HelpCircle className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-bold text-slate-700 dark:text-slate-300">Belum ada kuis</p>
          <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">
            Klik "Buat Kuis Baru" untuk memulai.
          </p>
          <button
            onClick={openNewQuiz}
            className="mt-5 min-h-[44px] flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat Kuis Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
              onClick={() => openEditQuiz(quiz.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">
                    {quiz.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        quiz.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {quiz.status === 'published' ? (
                        <Globe className="w-2.5 h-2.5" />
                      ) : (
                        <Lock className="w-2.5 h-2.5" />
                      )}
                      {quiz.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {modeLabels[quiz.mode] || quiz.mode}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeTab === 'library' && quiz.status === 'published' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAssignModalQuizId(quiz.id)
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Assign ke Kelas"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditQuiz(quiz.id)
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {quiz.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(quiz.id)
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {quiz.question_count} soal
                </span>
                {quiz.time_limit_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {quiz.time_limit_minutes} menit
                  </span>
                )}
                <span>Maks. {quiz.max_attempts}x</span>
                <span>Lulus: {quiz.passing_score}%</span>
              </div>

              {activeTab === 'library' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-between w-full"
                  >
                    <span>Assignment Status ({quiz.assignment_count || 0} kelas)</span>
                    <ArrowLeft
                      className={cn(
                        'w-3 h-3 transition-transform',
                        expandedQuizId === quiz.id ? 'rotate-90' : '-rotate-90'
                      )}
                    />
                  </button>

                  {expandedQuizId === quiz.id && (
                    <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                      <QuizAssignmentStatus
                        quizId={quiz.id}
                        onAssignClick={() => setAssignModalQuizId(quiz.id)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {assignModalQuizId && (
        <QuizAssignModal
          quizId={assignModalQuizId}
          isOpen={true}
          onClose={() => setAssignModalQuizId(null)}
          onSuccess={() => {
            setAssignModalQuizId(null)
            loadQuizzes()
          }}
        />
      )}
    </div>
  )
}
