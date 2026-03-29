import { ArrowRight, Clock, FileText, Plus, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { assignmentService } from '@/src/features/assignments/api/assignmentService'
import { AssignmentSkeleton } from '@/src/features/assignments/components/AssignmentSkeleton'
import {
  AssignmentListSidebar,
  CreateAssignmentModal,
  getStatusBadge,
  PrivateCommentsPanel,
  StudentSubmissionPanel,
  TeacherSubmissionsPanel,
} from '@/src/features/assignments/components/page'
import type { NewAssignmentData } from '@/src/features/assignments/components/page/CreateAssignmentModal'
import { useAssignments } from '@/src/features/assignments/hooks/useAssignments'
import type { AssignmentUiState } from '@/src/features/assignments/types'
import { useAddCalendarEvent } from '@/src/features/calendar/hooks/useCalendarQueries'
import { useComments } from '@/src/features/discussions/hooks/useCommentQueries'
import { useGradebook } from '@/src/features/gradebook/hooks/useGradebookQueries'
import { useSendNotification } from '@/src/features/notifications'
import { useDebounce } from '@/src/hooks/useDebounce'
import { usePageTitle } from '@/src/hooks/usePageTitle'

export function Assignments() {
  const addToast = useToast((s) => s.addToast)
  usePageTitle('Assignments')
  const { role, tenantId, user } = useAuth()
  const { addEvent } = useAddCalendarEvent()
  const sendNotification = useSendNotification()
  const { addAssignment: addGradebookAssignment, getStudentGrade } = useGradebook()
  const { addComment, getComments, setInitialComments } = useComments()
  const { assignments, loading, setAssignments, refetch } = useAssignments()
  const initialized = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (initialized.current) return
    assignments.forEach((a) => {
      a.studentSubmissions.forEach((s) => {
        if (a.comments.length > 0) {
          setInitialComments(
            a.id.toString(),
            s.id.toString(),
            a.comments.map((c) => ({ ...c, id: c.id.toString() }))
          )
        }
      })
    })
    initialized.current = true
  }, [assignments, setInitialComments])

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // ⚡ Perf: Debounce search input to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = useState(false)
  // newAssignment state is now managed inside CreateAssignmentModal via react-hook-form

  const activeAssignment = assignments.find((a) => a.id === selectedAssignment)
  const activeSelectedFile = activeAssignment ? selectedFiles[activeAssignment.id] : null

  // ⚡ Perf: Memoize filteredAssignments — was recomputed on every render without useMemo
  const filteredAssignments = useMemo(
    () =>
      (assignments || []).filter((a) => {
        const matchesSearch = a.title.toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchesStatus =
          filter === 'all' ||
          a.status === filter ||
          (filter === 'assigned' && a.status === 'late') ||
          (filter === 'submitted' && (a.status as string) === 'turned_in') ||
          (filter === 'graded' && (a.status as string) === 'returned') ||
          (filter === 'turned_in' && a.status === 'submitted') ||
          (filter === 'returned' && a.status === 'graded')
        const matchesType = typeFilter === 'all' || a.type === typeFilter
        return matchesSearch && matchesStatus && matchesType
      }),
    [assignments, debouncedSearch, filter, typeFilter]
  )

  if (loading) return <AssignmentSkeleton />

  const handleTurnIn = async (id: string) => {
    if (!tenantId || !user) return
    setIsUploading(true)
    setUploadProgress((prev) => ({ ...prev, [id]: 0 }))

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const current = prev[id] || 0
        if (current >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return { ...prev, [id]: Math.min(current + Math.random() * 7 + 8, 90) }
      })
    }, 200)

    try {
      const selectedFile = selectedFiles[id] || null
      let fileUrl: string | null = null
      if (selectedFile) {
        fileUrl = await assignmentService.uploadSubmissionFile(selectedFile, tenantId, id, user.id)
      }
      await assignmentService.submitAssignment({
        tenant_id: tenantId,
        assignment_id: id,
        student_id: user.id,
        submission_text: null,
        file_url: fileUrl,
        attempt_number: 1,
      })
      await refetch()
      setSelectedFiles((prev) => ({ ...prev, [id]: null }))
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to turn in assignment', error)
      addToast({ type: 'error', message: 'Gagal menyerahkan tugas.' })
    } finally {
      clearInterval(progressInterval)
      setUploadProgress((prev) => ({ ...prev, [id]: 100 }))
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress((prev) => {
          const n = { ...prev }
          delete n[id]
          return n
        })
      }, 200)
    }
  }

  const handleUnsubmit = (id: string) => {
    setAssignments(
      assignments.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'assigned',
              studentSubmissions: (a.studentSubmissions || []).map((s) =>
                s.studentName === 'Anda'
                  ? { ...s, status: 'assigned', submittedAt: null, uploadedFiles: [] }
                  : s
              ),
            }
          : a
      )
    )
  }

  const handleAddComment = (id: string) => {
    if (!newComment.trim()) return
    addComment(id.toString(), newComment)
    setNewComment('')
  }

  const handleCreateAssignment = (data: NewAssignmentData) => {
    const assignmentToAdd = {
      id: `a${Date.now()}`,
      title: data.title,
      type: data.type,
      description: data.description ?? '',
      dueDate: data.due_date,
      status: 'assigned' as const,
      grade: null,
      submittedAt: null,
      maxGrade: data.max_score,
      rawSubmissions: [],
      attachments: [],
      studentSubmissions: [
        {
          id: 1,
          studentName: 'Ahmad',
          status: 'assigned' as const,
          submittedAt: null,
          grade: null,
          uploadedFiles: [],
        },
        {
          id: 2,
          studentName: 'Bunga',
          status: 'assigned' as const,
          submittedAt: null,
          grade: null,
          uploadedFiles: [],
        },
        {
          id: 999,
          studentName: 'Anda',
          status: 'assigned' as const,
          submittedAt: null,
          grade: null,
          uploadedFiles: [],
        },
      ],
      comments: [],
    }
    setAssignments([assignmentToAdd as unknown as AssignmentUiState, ...assignments])

    const dueDateObj = new Date(data.due_date)
    addEvent({
      title: `Tugas: ${data.title}`,
      date: dueDateObj,
      time: dueDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: 'assignment',
      location: 'Online',
      description: data.description ?? '',
      priority: 'medium',
      completed: false,
      duration: 0,
    })
    addGradebookAssignment({
      id: assignmentToAdd.id.toString(),
      title: data.title,
      type: 'assignment',
      maxScore: data.max_score,
      date: dueDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    })
    sendNotification.mutate({
      userId: user!.id,
      type: 'assignment',
      title: 'Tugas Baru Dibuat',
      message: `${data.title} telah ditugaskan, ditambahkan ke kalender, dan buku nilai.`,
    })
    setIsCreateModalOpen(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Tugas Kelas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {role === 'teacher'
              ? 'Kelola dan pantau tugas siswa yang terhubung dengan Google Classroom.'
              : 'Lihat dan kumpulkan tugas Anda di sini.'}
          </p>
        </div>
        {role === 'teacher' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            Buat Tugas Baru
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AssignmentListSidebar
          assignments={assignments}
          filteredAssignments={filteredAssignments}
          searchTerm={searchTerm}
          filter={filter}
          typeFilter={typeFilter}
          selectedAssignment={selectedAssignment}
          onSearchChange={setSearchTerm}
          onFilterChange={setFilter}
          onTypeFilterChange={setTypeFilter}
          onSelectAssignment={setSelectedAssignment}
        />

        {/* Right Column: Assignment Details */}
        <div className="lg:col-span-2">
          {activeAssignment ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
              {/* Detail Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  {getStatusBadge(activeAssignment.status)}
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Tenggat: {new Date(activeAssignment.dueDate).toLocaleString('id-ID')}
                    </span>
                    {activeAssignment.grade !== null && activeAssignment.grade !== undefined && (
                      <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800">
                        Nilai: {activeAssignment.grade}/{activeAssignment.maxGrade}
                      </span>
                    )}
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  {activeAssignment.title}
                </h2>
                {activeAssignment.description ? (
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {activeAssignment.description}
                  </p>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic text-sm">
                    Instruksi belum diberikan. Hubungi guru untuk informasi lebih lanjut.
                  </p>
                )}
                {(activeAssignment.attachments || []).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                      Lampiran Guru:
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {activeAssignment.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          className="flex items-center gap-3 p-3 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-red-500 shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {att.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                              {att.type}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-950/30">
                {activeAssignment.type === 'group' ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-6">
                      <Users className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Tugas Kelompok
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                      Tugas ini dikerjakan secara berkelompok. Buka ruang kolaborasi untuk melihat
                      anggota kelompok, berdiskusi, dan mengerjakan tugas bersama.
                    </p>
                    <Link
                      to="/group-assignment"
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                    >
                      Buka Ruang Kolaborasi <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      {role === 'student' ? (
                        <StudentSubmissionPanel
                          assignment={activeAssignment}
                          selectedFile={activeSelectedFile}
                          isUploading={isUploading}
                          uploadProgress={uploadProgress}
                          fileInputRef={fileInputRef}
                          onFileChange={(id, file) =>
                            setSelectedFiles((prev) => ({ ...prev, [id]: file }))
                          }
                          onClearFile={(id) =>
                            setSelectedFiles((prev) => ({ ...prev, [id]: null }))
                          }
                          onTurnIn={handleTurnIn}
                          onUnsubmit={handleUnsubmit}
                        />
                      ) : (
                        <TeacherSubmissionsPanel
                          assignment={activeAssignment}
                          getStudentGrade={getStudentGrade}
                        />
                      )}
                    </div>
                    <PrivateCommentsPanel
                      comments={getComments(activeAssignment.id.toString())}
                      newComment={newComment}
                      role={role}
                      assignmentId={activeAssignment.id}
                      onCommentChange={setNewComment}
                      onAddComment={handleAddComment}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-12rem)] min-h-[600px] bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Tugas
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                Pilih tugas dari daftar di sebelah kiri untuk melihat detail, mengumpulkan tugas,
                atau memberikan komentar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal (Teacher) */}
      {role === 'teacher' && (
        <CreateAssignmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateAssignment}
        />
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">{previewFile}</h3>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                Pratinjau file {previewFile} belum tersedia.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
