import {
  ArrowLeft,
  Award,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  Send,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { VirtualTable } from '@/src/components/ui/VirtualTable'
import { useAuth } from '@/src/contexts/AuthContext'
import {
  type Assignment,
  assignmentService,
  type AssignmentSubmission,
} from '@/src/features/assignments/api/assignmentService'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { supabase } from '@/src/services/supabase/client'
import { cn } from '@/src/utils/cn'

export function AssignmentGradebook() {
  usePageTitle('Buku Nilai Tugas')
  const { user, tenantId } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([])

  const [_loading, setLoading] = useState(true)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [_error, setError] = useState<string | null>(null)

  // Grading State
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null)
  const [score, setScore] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    async function loadAssignments() {
      setLoading(true)
      try {
        // In a real app, we'd filter by teacher's courses.
        // For now, fetch all assignments in the tenant.
        const { data, error } = await supabase
          .from('assignments')
          .select(
            'id, tenant_id, course_id, lesson_id, title, instructions, max_points, max_attempts, is_published, due_date, created_by, created_at, updated_at'
          )
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAssignments(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }
    loadAssignments()
  }, [user?.id, tenantId])

  // ⚡ PERFORMANCE: Memoize handlers to prevent unnecessary re-renders
  const handleSelectAssignment = useCallback(async (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setLoadingSubmissions(true)
    try {
      const data = await assignmentService.getAssignmentSubmissions(assignment.id)
      setSubmissions(data || [])
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error fetching submissions:', err)
    } finally {
      setLoadingSubmissions(false)
    }
  }, [])

  // ⚡ PERFORMANCE: Memoize grading handlers
  const handleOpenGrading = useCallback((submission: AssignmentSubmission) => {
    setGradingSubmission(submission)
    setScore(submission.score || 0)
    setFeedback(submission.feedback || '')
  }, [])

  const handleSaveGrade = useCallback(async () => {
    if (!gradingSubmission) return
    setIsSubmittingGrade(true)
    try {
      const result = await assignmentService.gradeSubmission(gradingSubmission.id, score, feedback)
      // Update local state
      setSubmissions((prev) => prev.map((s) => (s.id === result.id ? result : s)))
      setGradingSubmission(null)
    } catch (err) {
      alert('Gagal menyimpan nilai: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsSubmittingGrade(false)
    }
  }, [gradingSubmission, score, feedback])

  const submissionColumns = useMemo(
    () => [
      {
        key: 'student',
        header: 'Siswa',
        render: (sub: AssignmentSubmission) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
              {Array.isArray(sub.user_profiles)
                ? sub.user_profiles[0]?.full_name?.charAt(0)
                : sub.user_profiles?.full_name?.charAt(0) || '?'}
            </div>
            <span className="font-bold text-slate-700">
              {Array.isArray(sub.user_profiles)
                ? sub.user_profiles[0]?.full_name
                : sub.user_profiles?.full_name || 'Siswa'}
            </span>
          </div>
        ),
      },
      {
        key: 'submitted_at',
        header: 'Tanggal Pengiriman',
        render: (sub: AssignmentSubmission) => (
          <span className="text-sm text-slate-500">
            {new Date(sub.submitted_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (sub: AssignmentSubmission) => (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest',
              sub.status === 'graded'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            )}
          >
            {sub.status === 'graded' ? (
              <>
                <CheckCircle className="w-2.5 h-2.5" /> Dinilai
              </>
            ) : (
              <>
                <Clock className="w-2.5 h-2.5" /> Sedang Diperiksa
              </>
            )}
          </span>
        ),
      },
      {
        key: 'score',
        header: 'Nilai',
        render: (sub: AssignmentSubmission) => (
          <span
            className={cn(
              'font-bold',
              sub.status === 'graded' ? 'text-emerald-600' : 'text-slate-300'
            )}
          >
            {sub.status === 'graded' ? `${sub.score}/${selectedAssignment?.max_points}` : '-'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Aksi',
        render: (sub: AssignmentSubmission) => (
          <button
            onClick={() => handleOpenGrading(sub)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all transform active:scale-95 shadow-md shadow-blue-500/20"
          >
            {sub.status === 'graded' ? 'Edit Nilai' : 'Nilai Sekarang'}
          </button>
        ),
      },
    ],
    [selectedAssignment, handleOpenGrading]
  )

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Buku Nilai Tugas
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola pengiriman tugas dan berikan penilaian kepada siswa.
          </p>
        </div>
        {!selectedAssignment && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari tugas..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
              />
            </div>
          </div>
        )}
      </header>

      {!selectedAssignment ? (
        /* Assignments Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600">Belum Ada Tugas</h3>
              <p className="text-slate-400">Buat tugas pertama Anda di Course Builder.</p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <motion.button
                key={assignment.id}
                whileHover={{ y: -4 }}
                onClick={() => handleSelectAssignment(assignment)}
                className="group text-left bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col h-full"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2 flex-1">
                  {assignment.title}
                </h3>
                <div className="flex items-center gap-4 mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    {assignment.max_points} Pts
                  </span>
                  {assignment.due_date && (
                    <span className="flex items-center gap-1.5 text-rose-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(assignment.due_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
              </motion.button>
            ))
          )}
        </div>
      ) : (
        /* Submissions List View */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedAssignment(null)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke semua tugas
          </button>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
              <h2 className="text-2xl font-extrabold text-slate-800">{selectedAssignment.title}</h2>
              <div className="flex items-center gap-6 mt-3 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-500" />
                  Maksimum {selectedAssignment.max_points} Poin
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  {submissions.length} Pengiriman
                </span>
              </div>
            </div>

            {loadingSubmissions ? (
              <div className="px-8 py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Memuat pengiriman...
              </div>
            ) : (
              <VirtualTable<AssignmentSubmission>
                data={submissions}
                columns={submissionColumns}
                rowHeight={52}
                maxHeight={550}
                getRowKey={(sub) => sub.id}
                emptyState={
                  <div className="px-8 py-12 text-center text-slate-500 font-medium italic">
                    Belum ada siswa yang mengirimkan tugas.
                  </div>
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Grading Modal */}
      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGradingSubmission(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Menilai:{' '}
                      {Array.isArray(gradingSubmission?.user_profiles)
                        ? gradingSubmission?.user_profiles[0]?.full_name
                        : gradingSubmission?.user_profiles?.full_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Tugas: {selectedAssignment?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setGradingSubmission(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Student Submission */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest px-1">
                    Hasil Pekerjaan Siswa
                  </h4>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 min-h-[300px] text-slate-700 whitespace-pre-wrap text-sm leading-relaxed italic">
                    {gradingSubmission.submission_text || 'Siswa tidak menyertakan teks tambahan.'}
                  </div>
                  {gradingSubmission.file_url && (
                    <a
                      href={gradingSubmission.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-bold text-slate-600">Buka File Lampiran</span>
                    </a>
                  )}
                </div>

                {/* Grading Form */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest px-1">
                    Berikan Penilaian
                  </h4>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                      Skor (0 - {selectedAssignment?.max_points})
                      <span className="text-blue-600">
                        {score} / {selectedAssignment?.max_points}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedAssignment?.max_points}
                      value={score}
                      onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Umpan Balik (Feedback)
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                      placeholder="Tuliskan catatan untuk siswa di sini..."
                    />
                  </div>

                  <button
                    onClick={handleSaveGrade}
                    disabled={isSubmittingGrade}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 transform active:scale-[0.98]"
                  >
                    {isSubmittingGrade ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    Kirim Penilaian
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
