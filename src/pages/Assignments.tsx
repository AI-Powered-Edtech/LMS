import { AlertCircle, BellRing, Clock, FileText, Plus, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type {
  AssignmentAnalytics,
  AssignmentGradingQueue,
  AssignmentSubmissionBundle,
} from '@/features/assignments/api/assignmentService'
import { assignmentService } from '@/features/assignments/api/assignmentService'
import { AssignmentSkeleton } from '@/features/assignments/components/AssignmentSkeleton'
import {
  AssignmentListSidebar,
  CreateAssignmentModal,
  getStatusBadge,
  PrivateCommentsPanel,
  StudentSubmissionPanel,
  TeacherSubmissionsPanel,
} from '@/features/assignments/components/page'
import type { NewAssignmentData } from '@/features/assignments/components/page/CreateAssignmentModal'
import { useAssignments } from '@/features/assignments/hooks/useAssignments'
import type { AssignmentUiState } from '@/features/assignments/types'
import { useComments } from '@/features/discussions/hooks/useCommentQueries'
import { useDebounce } from '@/hooks/useDebounce'
import { usePageTitle } from '@/hooks/usePageTitle'
import { sanitizeUrl } from '@/utils/sanitize'
import { translateLessonType } from '@/utils/statusTranslations'

function deriveStudentStatus(
  assignment: AssignmentUiState,
  bundle: AssignmentSubmissionBundle | null
): AssignmentUiState['status'] {
  const latestAttempt = bundle?.latest_attempt

  if (latestAttempt?.status === 'graded' || latestAttempt?.status === 'returned') {
    return 'graded'
  }
  if (latestAttempt?.status === 'submitted') {
    return 'submitted'
  }
  if (latestAttempt?.status === 'late') {
    return 'late'
  }
  if (new Date(assignment.dueDate) < new Date()) {
    return 'late'
  }
  return 'assigned'
}

function mergeStudentAssignment(
  assignment: AssignmentUiState,
  bundle: AssignmentSubmissionBundle | null
): AssignmentUiState {
  if (!bundle) return assignment

  const attempts = [...bundle.attempts]
    .sort((left, right) => right.attempt_number - left.attempt_number)
    .map((attempt) => ({
      id: attempt.id,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      text: attempt.submission_text ?? '',
      fileUrl: attempt.file_url ?? null,
      fileName: attempt.file_url ? attempt.file_url.split('/').pop() || 'file' : null,
      linkUrl: attempt.link_url ?? null,
      rawScore: attempt.raw_score ?? null,
      grade: attempt.score ?? null,
      feedback: attempt.feedback ?? null,
      isLate: attempt.is_late,
      latePenaltyPercent: attempt.late_penalty_percent,
    }))

  return {
    ...assignment,
    attempts,
    remainingAttempts: bundle.remaining_attempts,
    canResubmit: bundle.can_resubmit,
    submittedAt: bundle.latest_attempt?.submitted_at ?? null,
    grade: bundle.latest_attempt?.score ?? null,
    rawScore: bundle.latest_attempt?.raw_score ?? null,
    status: deriveStudentStatus(assignment, bundle),
  }
}

export function Assignments() {
  usePageTitle('Tugas')
  const addToast = useToast((state) => state.addToast)
  const { role, tenantId, user } = useAuth()
  const { addComment, getComments } = useComments()
  const { assignments, loading, refetch } = useAssignments()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newComment, setNewComment] = useState('')

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({})
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({})
  const [draftLinks, setDraftLinks] = useState<Record<string, string>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [isSendingReminder, setIsSendingReminder] = useState(false)

  const [activeBundle, setActiveBundle] = useState<AssignmentSubmissionBundle | null>(null)
  const [activeGradingQueue, setActiveGradingQueue] = useState<AssignmentGradingQueue | null>(null)
  const [activeAnalytics, setActiveAnalytics] = useState<AssignmentAnalytics | null>(null)

  useEffect(() => {
    if (!selectedAssignment && assignments.length > 0) {
      setSelectedAssignment(assignments[0].id)
    }
  }, [assignments, selectedAssignment])

  const filteredAssignments = useMemo(
    () =>
      assignments.filter((assignment) => {
        const matchesSearch = assignment.title.toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchesStatus =
          filter === 'all' ||
          assignment.status === filter ||
          (filter === 'assigned' && assignment.status === 'late')
        const matchesType = typeFilter === 'all' || assignment.type === typeFilter
        return matchesSearch && matchesStatus && matchesType
      }),
    [assignments, debouncedSearch, filter, typeFilter]
  )

  const activeAssignment =
    assignments.find((assignment) => assignment.id === selectedAssignment) ?? null

  useEffect(() => {
    if (!activeAssignment || !tenantId || !user) {
      setActiveBundle(null)
      setActiveGradingQueue(null)
      setActiveAnalytics(null)
      return
    }

    let cancelled = false

    const loadContext = async () => {
      setIsLoadingContext(true)
      try {
        if (role === 'student') {
          const bundle = await assignmentService.getAssignmentSubmissionBundle(
            activeAssignment.id,
            user.id,
            tenantId
          )
          if (!cancelled) setActiveBundle(bundle)
        } else {
          const [queue, analytics] = await Promise.all([
            assignmentService.getAssignmentGradingQueue(activeAssignment.id, tenantId),
            assignmentService.getAssignmentAnalytics(activeAssignment.id, tenantId),
          ])

          if (!cancelled) {
            setActiveGradingQueue(queue)
            setActiveAnalytics(analytics)
          }
        }
      } catch {
        if (!cancelled) {
          addToast({
            type: 'error',
            message: 'Gagal memuat detail assignment.',
          })
        }
      } finally {
        if (!cancelled) setIsLoadingContext(false)
      }
    }

    void loadContext()

    return () => {
      cancelled = true
    }
  }, [activeAssignment, addToast, role, tenantId, user])

  const activeStudentAssignment =
    role === 'student' && activeAssignment
      ? mergeStudentAssignment(activeAssignment, activeBundle)
      : activeAssignment

  const activeSelectedFile = activeAssignment ? (selectedFiles[activeAssignment.id] ?? null) : null
  const activeDraftText = activeAssignment ? (draftTexts[activeAssignment.id] ?? '') : ''
  const activeDraftLink = activeAssignment ? (draftLinks[activeAssignment.id] ?? '') : ''

  if (loading) {
    return <AssignmentSkeleton />
  }

  const reloadActiveContext = async (assignmentId: string) => {
    if (!tenantId || !user) return

    if (role === 'student') {
      const bundle = await assignmentService.getAssignmentSubmissionBundle(
        assignmentId,
        user.id,
        tenantId
      )
      setActiveBundle(bundle)
      return
    }

    const [queue, analytics] = await Promise.all([
      assignmentService.getAssignmentGradingQueue(assignmentId, tenantId),
      assignmentService.getAssignmentAnalytics(assignmentId, tenantId),
    ])
    setActiveGradingQueue(queue)
    setActiveAnalytics(analytics)
  }

  const handleTurnIn = async (assignmentId: string) => {
    if (!tenantId || !user) return

    setIsUploading(true)
    setUploadProgress((previous) => ({ ...previous, [assignmentId]: 0 }))

    const progressInterval = window.setInterval(() => {
      setUploadProgress((previous) => {
        const current = previous[assignmentId] ?? 0
        if (current >= 90) return previous
        return {
          ...previous,
          [assignmentId]: Math.min(current + Math.random() * 7 + 8, 90),
        }
      })
    }, 200)

    try {
      const selectedFile = selectedFiles[assignmentId] ?? null
      let uploadedFileUrl: string | null = null

      if (selectedFile) {
        uploadedFileUrl = await assignmentService.uploadSubmissionFile(
          selectedFile,
          tenantId,
          assignmentId,
          user.id
        )
      }

      await assignmentService.submitAssignmentAttempt(assignmentId, user.id, tenantId, {
        text: draftTexts[assignmentId] ?? '',
        linkUrl: draftLinks[assignmentId] ?? '',
        fileUrl: uploadedFileUrl,
        clientRequestId: crypto.randomUUID(),
      })

      setDraftTexts((previous) => ({ ...previous, [assignmentId]: '' }))
      setDraftLinks((previous) => ({ ...previous, [assignmentId]: '' }))
      setSelectedFiles((previous) => ({ ...previous, [assignmentId]: null }))

      await Promise.all([refetch(), reloadActiveContext(assignmentId)])

      addToast({
        type: 'success',
        message: 'Attempt berhasil disubmit.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menyerahkan tugas.',
      })
    } finally {
      window.clearInterval(progressInterval)
      setUploadProgress((previous) => ({ ...previous, [assignmentId]: 100 }))
      window.setTimeout(() => {
        setIsUploading(false)
        setUploadProgress((previous) => {
          const next = { ...previous }
          delete next[assignmentId]
          return next
        })
      }, 250)
    }
  }

  const handleUnsubmit = async (assignmentId: string) => {
    if (!tenantId || !user) return

    try {
      await assignmentService.unsubmitAssignment(assignmentId, user.id, tenantId)
      await Promise.all([refetch(), reloadActiveContext(assignmentId)])
      addToast({ type: 'success', message: 'Submit dibatalkan.' })
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal membatalkan submit.',
      })
    }
  }

  const handleCreateAssignment = async (data: NewAssignmentData) => {
    if (!tenantId || !user) return

    try {
      const newAssignment = await assignmentService.createAssignment({
        tenant_id: tenantId,
        course_id: null,
        class_id: null,
        lesson_id: null,
        title: data.title,
        description: data.description ?? null,
        instructions: data.description ?? null,
        max_points: data.max_score,
        max_attempts: data.max_attempts,
        status: 'published',
        is_published: true,
        late_penalty_percent: data.late_penalty_percent,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        available_from: data.available_from ? new Date(data.available_from).toISOString() : null,
        allow_text_submission: data.allow_text_submission,
        allow_file_submission: data.allow_file_submission,
        allow_link_submission: data.allow_link_submission,
        reminder_enabled: data.reminder_enabled,
        created_by: user.id,
      })

      await refetch()
      setSelectedAssignment(newAssignment.id)
      setIsCreateModalOpen(false)
      addToast({
        type: 'success',
        message: 'Tugas berhasil dibuat.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal membuat tugas.',
      })
    }
  }

  const handleAddComment = (assignmentId: string) => {
    if (!newComment.trim()) return
    void addComment(assignmentId.toString(), newComment)
    setNewComment('')
  }

  const handleSendReminder = async () => {
    if (!activeAssignment || !tenantId) return

    setIsSendingReminder(true)
    try {
      const result = await assignmentService.sendAssignmentReminders(activeAssignment.id, tenantId)
      await reloadActiveContext(activeAssignment.id)
      addToast({
        type: 'success',
        message: `Pengingat dikirim ke ${result.recipient_count} siswa.`,
      })
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal mengirim pengingat.',
      })
    } finally {
      setIsSendingReminder(false)
    }
  }

  const reminderTargetCount = activeGradingQueue?.counts.not_submitted ?? 0

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Tugas Kelas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {role === 'teacher'
              ? 'Kelola assignment native dengan attempt, reminder, dan analytics.'
              : 'Lihat detail tugas, submit attempt, dan pantau hasil penilaian Anda.'}
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

        <div className="lg:col-span-2">
          {activeAssignment ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  {getStatusBadge((activeStudentAssignment ?? activeAssignment).status)}
                  <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Tenggat: {new Date(activeAssignment.dueDate).toLocaleString('id-ID')}
                    </span>
                    {(activeStudentAssignment ?? activeAssignment).grade !== null && (
                      <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800">
                        Nilai: {(activeStudentAssignment ?? activeAssignment).grade}/
                        {activeAssignment.maxGrade}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
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
                  </div>

                  {role !== 'student' && (
                    <button
                      type="button"
                      onClick={handleSendReminder}
                      disabled={isSendingReminder || reminderTargetCount === 0}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 flex items-center gap-2"
                    >
                      <BellRing className="w-4 h-4" />
                      Kirim pengingat ({reminderTargetCount})
                    </button>
                  )}
                </div>

                {(activeAssignment.attachments || []).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                      Lampiran Guru
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {activeAssignment.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={sanitizeUrl(attachment.url)}
                          className="flex items-center gap-3 p-3 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-red-500 shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                              {translateLessonType(attachment.type)}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                      anggota kelompok dan mengerjakan tugas bersama.
                    </p>
                    <Link
                      to="/group-assignment"
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                    >
                      Buka Ruang Kolaborasi
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {role !== 'student' && activeAnalytics && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Submission Rate
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {Math.round(activeAnalytics.submission_rate)}%
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Sudah Dinilai
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {activeAnalytics.graded_count}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Telat
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {activeAnalytics.late_count}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Rata-rata Nilai
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {activeAnalytics.avg_effective_score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )}

                    {role !== 'student' &&
                      activeAnalytics &&
                      activeAnalytics.score_distribution.length > 0 && (
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6">
                          <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                            Distribusi Nilai
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            {activeAnalytics.score_distribution.map((bucket) => (
                              <div
                                key={bucket.bucket}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50"
                              >
                                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  {bucket.bucket}
                                </div>
                                <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                                  {bucket.count}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {isLoadingContext && (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        Memuat data assignment terbaru...
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        {role === 'student' && activeStudentAssignment ? (
                          <StudentSubmissionPanel
                            assignment={activeStudentAssignment}
                            selectedFile={activeSelectedFile}
                            draftText={activeDraftText}
                            draftLink={activeDraftLink}
                            isUploading={isUploading}
                            uploadProgress={uploadProgress}
                            fileInputRef={fileInputRef}
                            onFileChange={(assignmentId, file) =>
                              setSelectedFiles((previous) => ({
                                ...previous,
                                [assignmentId]: file,
                              }))
                            }
                            onClearFile={(assignmentId) =>
                              setSelectedFiles((previous) => ({
                                ...previous,
                                [assignmentId]: null,
                              }))
                            }
                            onTextChange={(assignmentId, value) =>
                              setDraftTexts((previous) => ({ ...previous, [assignmentId]: value }))
                            }
                            onLinkChange={(assignmentId, value) =>
                              setDraftLinks((previous) => ({ ...previous, [assignmentId]: value }))
                            }
                            onTurnIn={handleTurnIn}
                            onUnsubmit={handleUnsubmit}
                          />
                        ) : (
                          <TeacherSubmissionsPanel
                            assignment={activeAssignment}
                            gradingQueue={activeGradingQueue}
                          />
                        )}
                      </div>

                      <div className="space-y-6">
                        {role !== 'student' && activeGradingQueue && reminderTargetCount > 0 && (
                          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                {reminderTargetCount} siswa belum submit
                              </p>
                              <p className="text-sm text-amber-700 dark:text-amber-400">
                                Gunakan tombol pengingat untuk menghubungi siswa yang masih
                                berstatus not submitted.
                              </p>
                            </div>
                          </div>
                        )}

                        <PrivateCommentsPanel
                          comments={getComments(activeAssignment.id.toString())}
                          newComment={newComment}
                          role={role}
                          assignmentId={activeAssignment.id}
                          onCommentChange={setNewComment}
                          onAddComment={handleAddComment}
                        />
                      </div>
                    </div>
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
                Pilih tugas dari daftar di sebelah kiri untuk melihat detail, attempt, atau status
                grading.
              </p>
            </div>
          )}
        </div>
      </div>

      {role === 'teacher' && (
        <CreateAssignmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateAssignment}
        />
      )}
    </div>
  )
}
