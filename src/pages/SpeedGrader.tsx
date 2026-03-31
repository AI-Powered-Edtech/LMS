import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { aiGraderService } from '@/src/features/assignments/api/aiGraderService'
import { assignmentService } from '@/src/features/assignments/api/assignmentService'
import { useComments } from '@/src/features/discussions/hooks/useCommentQueries'
import type {
  ActiveTool,
  Annotation,
  SaveStatus,
  SpeedGraderStudent,
} from '@/src/features/gradebook/components/speedgrader'
import {
  DEFAULT_RUBRIC,
  DocumentViewer,
  GraderTopBar,
  RubricPanel,
  SaveStatusToast,
} from '@/src/features/gradebook/components/speedgrader'
import { useGradebook } from '@/src/features/gradebook/hooks/useGradebookQueries'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'
import { captureError } from '@/src/utils/sentry'

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
  const [isLoading, setIsLoading] = useState(false)
  const [isAIGrading, setIsAIGrading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [zoom, setZoom] = useState(100)
  const [activeTool, setActiveTool] = useState<ActiveTool>('pointer')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const documentRef = useRef<HTMLDivElement>(null)

  const currentStudent = students[currentStudentIdx]
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

  // Load submission data when switching students
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!assignmentId || !currentStudent) return

    const loadStudentData = async () => {
      setIsLoading(true)
      setSaveStatus('idle')

      try {
        const assignment = await assignmentService.getAssignmentById(
          assignmentId,
          tenantId ?? undefined
        )
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
        const submissionText = await assignmentService.getSubmissionText(
          assignmentId,
          currentStudent.id,
          tenantId ?? undefined
        )

        setSubmissionText(submissionText || '')
        const existingGrade = grades[currentStudent.id]?.[assignmentId]
        setScores({})
        setFeedback(existingGrade?.feedback || '')
        setAnnotations([])
        setZoom(100)
        setActiveTool('pointer')
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error loading submission:', err)
        captureError(err, { context: 'SpeedGrader.loadSubmission' })
        setSubmissionText('')
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

  const handleDocumentClick = (e: React.MouseEvent) => {
    if (activeTool !== 'comment' || !documentRef.current) return
    const rect = documentRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (annotations.length === 0)
      addToast({
        type: 'info',
        message: 'Fitur penyimpanan anotasi sedang dalam pengembangan.',
        duration: 5000,
      })
    setAnnotations((prev) => [...prev, { id: Date.now().toString(), x, y, text: '', isOpen: true }])
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <DocumentViewer
          isLoading={isLoading}
          submissionText={submissionText}
          studentName={currentStudent?.name || ''}
          zoom={zoom}
          activeTool={activeTool}
          annotations={annotations}
          documentRef={documentRef}
          onZoomChange={setZoom}
          onToolChange={setActiveTool}
          onDocumentClick={handleDocumentClick}
          onAnnotationToggle={(id) =>
            setAnnotations((prev) =>
              prev.map((a) => (a.id === id ? { ...a, isOpen: !a.isOpen } : a))
            )
          }
          onAnnotationUpdate={(id, text) =>
            setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a)))
          }
          onAnnotationDelete={(id) => setAnnotations((prev) => prev.filter((a) => a.id !== id))}
        />

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
        />
      </div>
    </div>
  )
}
