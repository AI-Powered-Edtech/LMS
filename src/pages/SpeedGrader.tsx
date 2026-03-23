import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { aiGraderService } from '@/src/features/assignments/api/aiGraderService'
import { useGradebook } from '@/src/features/assignments/hooks/useGradebookQueries'
import { useComments } from '@/src/features/discussions/hooks/useCommentQueries'
import type {
  ActiveTool,
  Annotation,
  SaveStatus,
} from '@/src/features/gradebook/components/speedgrader'
import {
  DEFAULT_RUBRIC,
  DocumentViewer,
  GraderTopBar,
  RubricPanel,
  SaveStatusToast,
} from '@/src/features/gradebook/components/speedgrader'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'
import { supabase } from '@/src/services/supabase/client'

export function SpeedGrader() {
  usePageTitle('Speed Grader')
  const { students: contextStudents, grades, updateGrade } = useGradebook()
  const { addComment } = useComments()
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const [searchParams] = useSearchParams()
  const assignmentId = searchParams.get('assignmentId') || 'a2'

  const students = contextStudents.map((s) => ({
    ...s,
    gradeEntry: grades[s.id]?.[assignmentId] ?? { score: null, status: 'ungraded' },
  }))

  const studentIdParam = searchParams.get('studentId')
  const initialStudentIdx = studentIdParam
    ? Math.max(
        0,
        students.findIndex((s) => s.id.toString() === studentIdParam)
      )
    : 0

  const [currentStudentIdx, setCurrentStudentIdx] = useState(initialStudentIdx)
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
  const loadStudentData = async () => {
    setIsLoading(true)
    setSaveStatus('idle')

    try {
      let assignmentQuery = supabase
        .from('assignments')
        .select('id, tenant_id')
        .eq('id', assignmentId)
      if (tenantId) assignmentQuery = assignmentQuery.eq('tenant_id', tenantId)

      const { data: assignment, error: assignmentError } = await assignmentQuery.single()
      if (assignmentError || !assignment) {
        if (import.meta.env.DEV)
          console.error('Assignment not found or access denied:', assignmentError)
        setIsLoading(false)
        return
      }
    } catch (authError) {
      if (import.meta.env.DEV) console.error('Authorization check failed:', authError)
      setIsLoading(false)
      return
    }

    try {
      let query = supabase
        .from('assignment_submissions')
        .select('submission_text')
        .eq('assignment_id', assignmentId)
        .eq('student_id', currentStudent.id)
      if (tenantId) query = query.eq('tenant_id', tenantId)

      const { data: submission, error } = await query.maybeSingle()
      if (error && import.meta.env.DEV) console.warn('Could not load submission:', error)

      setSubmissionText(submission?.submission_text || '')
      const existingGrade = grades[currentStudent.id]?.[assignmentId]
      setScores({})
      setFeedback(existingGrade?.feedback || '')
      setAnnotations([])
      setZoom(100)
      setActiveTool('pointer')
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Error loading submission:', err)
      setSubmissionText('')
    } finally {
      setIsLoading(false)
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    loadStudentData()
  }, [currentStudentIdx])
  /* eslint-enable react-hooks/exhaustive-deps */

  const saveCurrentStudent = (status: 'graded' | 'needs_revision' | 'ungraded' = 'graded') => {
    updateGrade(currentStudent.id, assignmentId, totalScore, status, feedback)
    if (feedback.trim()) addComment(assignmentId, feedback)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
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

  const handleSaveAndNext = (status: 'graded' | 'needs_revision' = 'graded') => {
    setSaveStatus('saving')
    updateGrade(currentStudent.id, assignmentId, totalScore, status, feedback)
    if (feedback.trim()) addComment(assignmentId, feedback)
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus('idle')
        handleNext()
      }, 500)
    }, 500)
  }

  const handleDocumentClick = (e: React.MouseEvent) => {
    if (activeTool !== 'comment' || !documentRef.current) return
    const rect = documentRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
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

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 relative">
      <SaveStatusToast status={saveStatus} />

      <GraderTopBar
        students={students}
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
          studentName={currentStudent.name}
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
          currentStudent={currentStudent}
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
