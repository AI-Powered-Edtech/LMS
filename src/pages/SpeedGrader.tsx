import { AlertCircle, FileText, Loader2, Save, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { aiGraderService } from '@/features/assignments/api/aiGraderService'
import type {
  AssignmentAttemptRecord,
  AssignmentGradingQueue,
  AssignmentSubmissionBundle,
} from '@/features/assignments/api/assignmentService'
import { assignmentService } from '@/features/assignments/api/assignmentService'
import type {
  ActiveTool,
  SaveStatus,
  SpeedGraderStudent,
} from '@/features/gradebook/components/speedgrader'
import {
  DocumentViewer,
  GraderTopBar,
  RubricPanel,
  SaveStatusToast,
} from '@/features/gradebook/components/speedgrader'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { captureError } from '@/utils/sentry'

function calculateEffectiveScore(rawScore: number, latePenaltyPercent: number) {
  return Math.max(Math.round((rawScore - (rawScore * latePenaltyPercent) / 100) * 100) / 100, 0)
}

export function SpeedGrader() {
  usePageTitle('Penilaian Cepat')
  const { tenantId } = useAuth()
  const addToast = useToast((state) => state.addToast)
  const [searchParams] = useSearchParams()

  const assignmentId = searchParams.get('assignmentId')
  const studentIdParam = searchParams.get('studentId')

  const [queue, setQueue] = useState<AssignmentGradingQueue | null>(null)
  const [bundle, setBundle] = useState<AssignmentSubmissionBundle | null>(null)
  const [currentStudentIdx, setCurrentStudentIdx] = useState(0)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [manualScore, setManualScore] = useState(0)
  const [isLoadingQueue, setIsLoadingQueue] = useState(false)
  const [isLoadingBundle, setIsLoadingBundle] = useState(false)
  const [isAIGrading, setIsAIGrading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [zoom, setZoom] = useState(100)
  const [activeTool, setActiveTool] = useState<ActiveTool>('pointer')
  const [mobileActiveTab, setMobileActiveTab] = useState<'document' | 'penilaian'>('document')
  const documentRef = useRef<HTMLDivElement>(null)

  const queueStudents = useMemo(() => queue?.students ?? [], [queue?.students])
  const currentQueueStudent = queueStudents[currentStudentIdx] ?? null
  const latestAttempt = bundle?.latest_attempt ?? null
  const selectedAttempt = useMemo<AssignmentAttemptRecord | null>(() => {
    if (!bundle) return null
    return bundle.attempts.find((attempt) => attempt.id === selectedAttemptId) ?? latestAttempt
  }, [bundle, latestAttempt, selectedAttemptId])

  const effectiveScore = useMemo(
    () => calculateEffectiveScore(manualScore, latestAttempt?.late_penalty_percent ?? 0),
    [latestAttempt?.late_penalty_percent, manualScore]
  )

  const speedGraderStudents: SpeedGraderStudent[] = useMemo(
    () =>
      queueStudents.map((student) => ({
        id: student.student_id,
        name: student.student_name,
        gradeEntry: {
          score: student.score ?? student.raw_score ?? null,
          status: student.status,
        },
      })),
    [queueStudents]
  )

  useEffect(() => {
    if (!assignmentId || !tenantId) return

    let cancelled = false

    const loadQueue = async () => {
      setIsLoadingQueue(true)
      try {
        const gradingQueue = await assignmentService.getAssignmentGradingQueue(
          assignmentId,
          tenantId
        )
        if (cancelled) return

        setQueue(gradingQueue)
        if (studentIdParam) {
          const initialIndex = gradingQueue.students.findIndex(
            (student) => student.student_id === studentIdParam
          )
          setCurrentStudentIdx(initialIndex >= 0 ? initialIndex : 0)
        } else {
          setCurrentStudentIdx(0)
        }
      } catch {
        if (!cancelled) {
          addToast({
            type: 'error',
            message: 'Gagal memuat grading queue.',
          })
        }
      } finally {
        if (!cancelled) setIsLoadingQueue(false)
      }
    }

    void loadQueue()

    return () => {
      cancelled = true
    }
  }, [addToast, assignmentId, studentIdParam, tenantId])

  useEffect(() => {
    if (!assignmentId || !tenantId || !currentQueueStudent) {
      setBundle(null)
      return
    }

    let cancelled = false

    const loadBundle = async () => {
      setIsLoadingBundle(true)
      setSaveStatus('idle')

      try {
        const submissionBundle = await assignmentService.getAssignmentSubmissionBundle(
          assignmentId,
          currentQueueStudent.student_id,
          tenantId
        )

        if (cancelled) return

        setBundle(submissionBundle)
        setSelectedAttemptId(submissionBundle.latest_attempt?.id ?? null)
        setFeedback(submissionBundle.latest_attempt?.feedback ?? '')
        setManualScore(
          Number(
            submissionBundle.latest_attempt?.raw_score ??
              submissionBundle.latest_attempt?.score ??
              0
          )
        )
        setZoom(100)
        setActiveTool('pointer')
      } catch (error) {
        if (cancelled) return
        captureError(error, { context: 'SpeedGrader.loadBundle' })
        addToast({
          type: 'error',
          message: 'Gagal memuat submission siswa.',
        })
        setBundle(null)
      } finally {
        if (!cancelled) setIsLoadingBundle(false)
      }
    }

    void loadBundle()

    return () => {
      cancelled = true
    }
  }, [addToast, assignmentId, currentQueueStudent, tenantId])

  if (!assignmentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FileText className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Penilaian Cepat
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Pilih tugas dari Buku Nilai Tugas untuk mulai menilai pekerjaan siswa.
          </p>
          <Link
            to="/app/teacher/assignment-gradebook"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            Buka Buku Nilai Tugas
          </Link>
        </div>
      </div>
    )
  }

  if (!isLoadingQueue && queueStudents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Belum Ada Pekerjaan untuk Dinilai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Antrian penilaian tugas ini masih kosong. Siswa belum mengumpulkan pekerjaan atau semua sudah selesai dinilai.
          </p>
        </div>
      </div>
    )
  }

  const isLoading = isLoadingQueue || isLoadingBundle

  const refreshCurrentState = async () => {
    if (!assignmentId || !tenantId || !currentQueueStudent) return

    const [gradingQueue, submissionBundle] = await Promise.all([
      assignmentService.getAssignmentGradingQueue(assignmentId, tenantId),
      assignmentService.getAssignmentSubmissionBundle(
        assignmentId,
        currentQueueStudent.student_id,
        tenantId
      ),
    ])

    setQueue(gradingQueue)
    setBundle(submissionBundle)
    setSelectedAttemptId(submissionBundle.latest_attempt?.id ?? null)
    setFeedback(submissionBundle.latest_attempt?.feedback ?? '')
    setManualScore(
      Number(
        submissionBundle.latest_attempt?.raw_score ?? submissionBundle.latest_attempt?.score ?? 0
      )
    )
  }

  const handleStudentChange = (index: number) => {
    setCurrentStudentIdx(index)
  }

  const handlePrev = () => {
    setCurrentStudentIdx((index) => Math.max(index - 1, 0))
  }

  const handleNext = () => {
    setCurrentStudentIdx((index) => Math.min(index + 1, queueStudents.length - 1))
  }

  const handleSaveAndNext = async (status: 'graded' | 'needs_revision') => {
    if (!latestAttempt || !tenantId) {
      addToast({
        type: 'error',
        message: 'Belum ada attempt terbaru yang bisa dinilai.',
      })
      return
    }

    setSaveStatus('saving')
    try {
      await assignmentService.gradeSubmission(
        latestAttempt.id,
        tenantId,
        manualScore,
        feedback,
        status === 'needs_revision' ? 'returned' : 'graded'
      )

      await refreshCurrentState()
      setSaveStatus('saved')

      window.setTimeout(() => {
        setSaveStatus('idle')
        if (currentStudentIdx < queueStudents.length - 1) {
          setCurrentStudentIdx((index) => index + 1)
        }
      }, 400)
    } catch (error) {
      captureError(error, { context: 'SpeedGrader.save' })
      setSaveStatus('error')
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menyimpan penilaian.',
      })
    }
  }

  const handleAIGrading = async () => {
    if (!latestAttempt?.submission_text?.trim()) {
      addToast({
        type: 'error',
        message: 'Attempt terbaru tidak memiliki jawaban teks untuk auto-grade AI.',
      })
      return
    }

    if (
      feedback.trim().length > 0 &&
      !window.confirm('Tumpuk feedback AI di atas feedback yang ada?')
    ) {
      return
    }

    setIsAIGrading(true)
    try {
      const aiResponse = await aiGraderService.gradeEssay({
        submissionId: latestAttempt.id,
        essayText: latestAttempt.submission_text,
        rubric: [],
      })

      let aggregatedFeedback = aiResponse.overallFeedback ? `${aiResponse.overallFeedback}\n\n` : ''
      Object.entries(aiResponse.feedback ?? {}).forEach(([criterion, criterionFeedback]) => {
        aggregatedFeedback += `**${criterion}**: ${criterionFeedback}\n`
      })

      setFeedback(aggregatedFeedback.trim())
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menjalankan auto-grade AI.',
      })
    } finally {
      setIsAIGrading(false)
    }
  }

  const selectedStudent = speedGraderStudents[currentStudentIdx]

  if (!selectedStudent || !currentQueueStudent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Data siswa tidak ditemukan pada grading queue.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 relative">
      <SaveStatusToast status={saveStatus} />

      <GraderTopBar
        students={speedGraderStudents}
        currentStudentIdx={currentStudentIdx}
        isLoading={isLoading}
        onStudentChange={handleStudentChange}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <div className="flex md:hidden shrink-0 px-4 pt-3 pb-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          type="button"
          onClick={() => setMobileActiveTab('document')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]',
            mobileActiveTab === 'document'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          )}
        >
          <FileText className="w-4 h-4" />
          Dokumen
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveTab('penilaian')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]',
            mobileActiveTab === 'penilaian'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Penilaian
        </button>
      </div>

      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            {bundle?.assignment.title ?? 'Assignment'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Status queue: {currentQueueStudent.status.replace('_', ' ')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAttemptId ?? ''}
            onChange={(event) => setSelectedAttemptId(event.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {(bundle?.attempts ?? []).map((attempt) => (
              <option key={attempt.id} value={attempt.id}>
                Attempt {attempt.attempt_number}
                {attempt.id === latestAttempt?.id ? ' (terbaru)' : ''}
              </option>
            ))}
          </select>

          {selectedAttempt && latestAttempt && selectedAttempt.id !== latestAttempt.id && (
            <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-3 py-2 rounded-xl">
              Penilaian tetap disimpan pada attempt terbaru.
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div
          className={cn(
            'flex-1 flex flex-col overflow-hidden',
            mobileActiveTab !== 'document' ? 'hidden md:flex' : 'flex'
          )}
        >
          <DocumentViewer
            isLoading={isLoading}
            submissionText={selectedAttempt?.submission_text ?? ''}
            fileUrl={selectedAttempt?.file_url ?? null}
            linkUrl={selectedAttempt?.link_url ?? null}
            studentName={selectedStudent.name}
            zoom={zoom}
            activeTool={activeTool}
            submissionId={selectedAttempt?.id ?? null}
            documentRef={documentRef}
            onZoomChange={setZoom}
            onToolChange={setActiveTool}
          />
        </div>

        <div
          className={cn(
            mobileActiveTab !== 'penilaian' ? 'hidden md:flex md:flex-col' : 'flex flex-col',
            'md:w-96'
          )}
        >
          <RubricPanel
            currentStudent={selectedStudent}
            feedback={feedback}
            totalScore={0}
            manualScore={manualScore}
            effectiveScore={effectiveScore}
            maxScore={bundle?.assignment.max_points ?? 100}
            latePenaltyPercent={latestAttempt?.late_penalty_percent ?? 0}
            isLoading={isLoading}
            isAIGrading={isAIGrading}
            submissionId={latestAttempt?.id ?? null}
            assignmentId={assignmentId}
            tenantId={tenantId}
            onFeedbackChange={setFeedback}
            onManualScoreChange={setManualScore}
            onAIGrade={handleAIGrading}
            onSaveAndNext={handleSaveAndNext}
            isMobile={mobileActiveTab === 'penilaian'}
          />
        </div>
      </div>

      {mobileActiveTab === 'penilaian' && (
        <div className="flex md:hidden shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 gap-3 safe-area-bottom">
          <button
            type="button"
            onClick={() => void handleSaveAndNext('needs_revision')}
            disabled={isLoading}
            className="flex-1 min-h-[48px] bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-sm"
          >
            <AlertCircle className="w-5 h-5" />
            Minta Revisi
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAndNext('graded')}
            disabled={isLoading}
            className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200 dark:shadow-none active:scale-95 disabled:opacity-50 text-sm"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Simpan &amp; Lanjut
          </button>
        </div>
      )}
    </div>
  )
}
