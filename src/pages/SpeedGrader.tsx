import { AlertCircle, FileText, Save, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { aiGraderService } from '@/features/assignments/api/aiGraderService'
import { assignmentService } from '@/features/assignments/api/assignmentService'
import { useComments } from '@/features/discussions/hooks/useCommentQueries'
import type {
  ActiveTool,
  SaveStatus,
  SpeedGraderStudent,
} from '@/features/gradebook/components/speedgrader'
import {
  DEFAULT_RUBRIC,
  DocumentViewer,
  GraderTopBar,
  RubricPanel,
  SaveStatusToast,
} from '@/features/gradebook/components/speedgrader'
import { useGradebook } from '@/features/gradebook/hooks/useGradebookQueries'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { captureError } from '@/utils/sentry'

export function SpeedGrader() {
  usePageTitle('Penilaian Cepat')
  const { students, grades, updateGrade } = useGradebook()
  const { addComment } = useComments()
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const [searchParams] = useSearchParams()
  const assignmentId = searchParams.get('assignmentId')

  const studentIdParam = searchParams.get('studentId')

  const [currentStudentIdx, setCurrentStudentIdx] = useState(() => {
    if (!studentIdParam || !assignmentId) return 0
    const idx = students.findIndex((s) => s.id.toString() === studentIdParam)
    return Math.max(0, idx)
  })
  const [scores, setScores] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [submissionText, setSubmissionText] = useState('')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAIGrading, setIsAIGrading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [zoom, setZoom] = useState(100)
  const [activeTool, setActiveTool] = useState<ActiveTool>('pointer')
  const [mobileActiveTab, setMobileActiveTab] = useState<'document' | 'penilaian'>('document')
  const documentRef = useRef<HTMLDivElement>(null)

  const currentStudent = students[currentStudentIdx]
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

  // Load submission data when switching students
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!assignmentId || !currentStudent || !tenantId) return

    const loadStudentData = async () => {
      setIsLoading(true)
      setSaveStatus('idle')

      try {
        const assignment = await assignmentService.getAssignmentById(assignmentId, tenantId)
        if (!assignment) {
          if (import.meta.env.DEV) console.error('Assignment not found or access denied')
          setIsLoading(false)
          return
        }
      } catch (authError) {
        if (import.meta.env.DEV) console.error('Authorization check failed:', authError)
        setIsLoading(false)
        return
      }

      try {
        // Ambil submission ID dan teks sekaligus
        const submission = await assignmentService.getSubmission(
          assignmentId,
          currentStudent.id,
          tenantId
        )

        setSubmissionText(submission?.submission_text ?? '')
        setSubmissionId(submission?.id ?? null)
        const existingGrade = grades[currentStudent.id]?.[assignmentId]
        setScores({})
        setFeedback(existingGrade?.feedback || '')
        setZoom(100)
        setActiveTool('pointer')
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error loading submission:', err)
        captureError(err, { context: 'SpeedGrader.loadSubmission' })
        setSubmissionText('')
        setSubmissionId(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadStudentData()
  }, [currentStudentIdx])
  /* eslint-enable react-hooks/exhaustive-deps */

  const saveCurrentStudent = useCallback(
    async (status: 'graded' | 'needs_revision' | 'ungraded' = 'graded') => {
      if (!currentStudent || !assignmentId) return
      setSaveStatus('saving')
      try {
        updateGrade(currentStudent.id, assignmentId, totalScore, status, feedback)
        if (feedback.trim()) await addComment(assignmentId, feedback)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        setSaveStatus('error')
        console.error('Save failed:', error)
      }
    },
    [currentStudent, assignmentId, totalScore, feedback, updateGrade, addComment]
  )

  if (!assignmentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            Tugas Tidak Ditemukan
          </h2>
          <p className="text-slate-500 text-sm">Parameter assignmentId tidak ditemukan di URL.</p>
        </div>
      </div>
    )
  }

  if (!currentStudent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Tidak ada data siswa.</p>
      </div>
    )
  }

  const handleNext = () => {
    saveCurrentStudent()
    if (currentStudentIdx < students.length - 1) setCurrentStudentIdx((s) => s + 1)
  }

  const handlePrev = () => {
    saveCurrentStudent()
    if (currentStudentIdx > 0) setCurrentStudentIdx((s) => s - 1)
  }

  const handleStudentChange = (idx: number) => {
    saveCurrentStudent()
    setCurrentStudentIdx(idx)
  }

  const handleSaveAndNext = async (status: 'graded' | 'needs_revision' = 'graded') => {
    setSaveStatus('saving')
    try {
      updateGrade(currentStudent.id, assignmentId, totalScore, status, feedback)
      if (feedback.trim()) await addComment(assignmentId, feedback)
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus('idle')
        if (currentStudentIdx < students.length - 1) setCurrentStudentIdx((s) => s + 1)
      }, 500)
    } catch (err) {
      setSaveStatus('error')
      console.error('handleSaveAndNext failed:', err)
    }
  }

  const handleAIGrading = async () => {
    if (Object.keys(scores).length > 0 || feedback.trim().length > 0) {
      if (
        !confirm(
          'Apakah Anda yakin ingin menimpa nilai dan umpan balik yang sudah ada dengan hasil AI?'
        )
      )
        return
    }
    if (!submissionText?.trim()) {
      addToast({
        type: 'error',
        message:
          'Tidak ada teks esai yang dapat dinilai. Siswa mungkin belum mengumpulkan tugas atau mengumpulkan file saja.',
      })
      return
    }

    setIsAIGrading(true)
    try {
      const aiResponse = await aiGraderService.gradeEssay({
        submissionId: `${assignmentId}-${currentStudent.id}`,
        essayText: submissionText,
        rubric: DEFAULT_RUBRIC.map((r) => ({
          criterion: r.criterion,
          maxPoints: r.maxPoints,
          description: r.description,
        })),
      })

      const newScores: Record<string, number> = {}
      let aggregatedFeedback = aiResponse.overallFeedback ? aiResponse.overallFeedback + '\n\n' : ''
      DEFAULT_RUBRIC.forEach((r) => {
        if (aiResponse.scores[r.criterion] !== undefined)
          newScores[r.id] = aiResponse.scores[r.criterion]
        if (aiResponse.feedback[r.criterion] !== undefined)
          aggregatedFeedback += `**${r.criterion}**: ${aiResponse.feedback[r.criterion]}\n`
      })
      setScores(newScores)
      setFeedback(aggregatedFeedback.trim())
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('AI Grading failed:', error)
      addToast({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Gagal melakukan penilaian otomatis dengan AI.',
      })
    } finally {
      setIsAIGrading(false)
    }
  }

  // Map GradebookStudent to SpeedGraderStudent for GraderTopBar
  const speedGraderStudents: SpeedGraderStudent[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    gradeEntry: {
      score: grades[s.id]?.[assignmentId]?.score ?? null,
      status: grades[s.id]?.[assignmentId]?.status ?? 'ungraded',
    },
  }))

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

      {/* Mobile Tab Switcher — hanya tampil di mobile (< md) */}
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

      {/* Desktop: side-by-side. Mobile: tab-based full width */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* DocumentViewer: di desktop selalu tampil, di mobile hanya jika tab 'document' aktif */}
        <div
          className={cn(
            'flex-1 flex flex-col overflow-hidden',
            mobileActiveTab !== 'document' ? 'hidden md:flex' : 'flex'
          )}
        >
          <DocumentViewer
            isLoading={isLoading}
            submissionText={submissionText}
            studentName={currentStudent?.name || ''}
            zoom={zoom}
            activeTool={activeTool}
            submissionId={submissionId}
            documentRef={documentRef}
            onZoomChange={setZoom}
            onToolChange={setActiveTool}
          />
        </div>

        {/* RubricPanel: di desktop selalu tampil, di mobile hanya jika tab 'penilaian' aktif */}
        <div
          className={cn(
            mobileActiveTab !== 'penilaian' ? 'hidden md:flex md:flex-col' : 'flex flex-col',
            'md:w-96'
          )}
        >
          <RubricPanel
            currentStudent={speedGraderStudents[currentStudentIdx]}
            rubric={DEFAULT_RUBRIC}
            scores={scores}
            feedback={feedback}
            totalScore={totalScore}
            isLoading={isLoading}
            isAIGrading={isAIGrading}
            onScoreSelect={(criterionId, points) =>
              setScores((prev) => ({ ...prev, [criterionId]: points }))
            }
            onFeedbackChange={setFeedback}
            onAIGrade={handleAIGrading}
            onSaveAndNext={handleSaveAndNext}
            isMobile={mobileActiveTab === 'penilaian'}
          />
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar — hanya di tab penilaian */}
      {mobileActiveTab === 'penilaian' && (
        <div className="flex md:hidden shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 gap-3 safe-area-bottom">
          <button
            type="button"
            onClick={() => handleSaveAndNext('needs_revision')}
            disabled={isLoading}
            className="flex-1 min-h-[48px] bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-sm"
          >
            <AlertCircle className="w-5 h-5" />
            Minta Revisi
          </button>
          <button
            type="button"
            onClick={() => handleSaveAndNext('graded')}
            disabled={isLoading}
            className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200 dark:shadow-none active:scale-95 disabled:opacity-50 text-sm"
          >
            <Save className="w-5 h-5" />
            Simpan &amp; Lanjut
          </button>
        </div>
      )}
    </div>
  )
}
