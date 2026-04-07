import { HelpCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { classroomService } from '@/features/classroom/api/classroomService'
import { useClassroom } from '@/features/classroom/hooks/useClassroomQueries'
import { type QuizMode, quizService } from '@/features/quizzes'
import { QuizEditorView } from '@/features/quizzes/components/QuizEditorView'
import { QuizListView } from '@/features/quizzes/components/QuizListView'
import { emptyForm, type QuizFormData, useQuizForm } from '@/features/quizzes/hooks/useQuizForm'
import { QuizStatus } from '@/features/quizzes/types/quizzes.types'
import { usePageTitle } from '@/hooks/usePageTitle'

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
// Component
// ─────────────────────────────────────────────────────────

export function QuizManager() {
  usePageTitle('Manajemen Kuis')
  const { activeClassroomId, classrooms } = useClassroom()
  const { tenantId } = useAuth()

  const activeClass = classrooms.find((c) => c.id === activeClassroomId)

  const [studentCount, setStudentCount] = useState<number>(0)

  useEffect(() => {
    if (activeClassroomId && tenantId) {
      classroomService.getActiveEnrollmentCount(activeClassroomId, tenantId).then((count) => {
        setStudentCount(count)
      })
    }
  }, [activeClassroomId, tenantId])

  // Views: 'list' | 'editor'
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [activeTab, setActiveTab] = useState<'class' | 'library'>('class')
  const [assignModalQuizId, setAssignModalQuizId] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null)

  // Editor state
  const [isSaving, setIsSaving] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)

  const methods = useQuizForm(emptyForm)
  const { reset, watch, setValue, handleSubmit } = methods

  // ─── List Loading ──────────────────────────────────────

  const loadQuizzes = useCallback(async () => {
    if (!activeClassroomId || !tenantId) return
    setIsLoading(true)
    setError(null)
    try {
      let data
      if (activeTab === 'class') {
        data = await quizService.getQuizzesByClass(activeClassroomId, tenantId)
      } else {
        data = await quizService.getTeacherQuizzes(tenantId)
      }
      setQuizzes(data as QuizListItem[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [activeClassroomId, tenantId, activeTab])

  useEffect(() => {
    loadQuizzes()
  }, [loadQuizzes])

  // ─── Open Editor ────────────────────────────────────────

  const openNewQuiz = () => {
    reset({ ...emptyForm, questions: [] })
    setEditingQuizId(null)
    setView('editor')
  }

  const openEditQuiz = async (quizId: string) => {
    setIsLoading(true)
    try {
      const data = await quizService.getQuizWithQuestions(quizId, tenantId!)
      if (!data) throw new Error('Quiz not found')

      reset({
        id: data.id,
        title: data.title || '',
        instructions: data.instructions || '',
        mode: (data.mode as any) || 'graded',
        time_limit_minutes: data.time_limit_minutes,
        max_attempts: data.max_attempts || 3,
        passing_score: data.passing_score || 70,
        shuffle_questions: data.shuffle_questions || false,
        shuffle_options: data.shuffle_options || false,
        show_correct_answers: data.show_correct_answers || false,
        available_from: data.available_from || '',
        due_at: data.available_until || '',
        status: (data.status as any) || 'draft',
        questions: (data.quiz_questions || []).map((q: any) => ({
          id: q.id,
          text: q.text,
          order: q.order,
          question_type: (q.question_type as any) || 'MCQ',
          points: q.points ?? 1,
          explanation: q.explanation || null,
          tenant_id: q.tenant_id,
          options: (q.quiz_options || []).map((o: any) => ({
            id: o.id,
            text: o.text,
            is_correct: o.is_correct,
          })),
        })),
      })
      setEditingQuizId(quizId)
      setView('editor')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Save Quiz ──────────────────────────────────────────

  const handleSave = async (targetStatus?: QuizStatus) => {
    const onSubmit = async (data: QuizFormData) => {
      if (!activeClassroomId || !tenantId) return

      // Additional semantic validation for publishing
      if (targetStatus === 'published') {
        if (data.questions.length === 0) {
          setError('Tidak bisa publish kuis tanpa soal. Tambahkan minimal 1 soal.')
          return
        }
      }

      setIsSaving(true)
      setError(null)

      const status = targetStatus || data.status

      try {
        let quizId = editingQuizId

        if (!quizId) {
          // Create new quiz
          const created = await quizService.createQuiz({
            title: data.title,
            class_id: activeClassroomId,
            tenant_id: tenantId,
            instructions: data.instructions,
            mode: data.mode,
            time_limit_minutes: data.time_limit_minutes || undefined,
            max_attempts: data.max_attempts,
            passing_score: data.passing_score,
            shuffle_questions: data.shuffle_questions,
            shuffle_options: data.shuffle_options,
            show_correct_answers: data.show_correct_answers,
            available_from: data.available_from || null,
            due_at: data.due_at || null,
          })
          quizId = created.id
          setEditingQuizId(quizId)
          setValue('id', quizId ?? undefined)
        } else {
          // Update existing quiz settings
          await quizService.updateQuiz(
            quizId,
            {
              title: data.title,
              instructions: data.instructions || null,
              mode: data.mode,
              time_limit_minutes: data.time_limit_minutes,
              max_attempts: data.max_attempts,
              passing_score: data.passing_score,
              shuffle_questions: data.shuffle_questions,
              shuffle_options: data.shuffle_options,
              show_correct_answers: data.show_correct_answers,
              available_from: data.available_from || null,
              available_until: data.due_at || null,
              status,
            },
            tenantId
          )
        }

        // Sync questions: delete removed, update existing, add new
        const existingQs = data.questions.filter((q) => q.id)
        const newQs = data.questions.filter((q) => !q.id)

        const currentQuizData = await quizService.getQuizWithQuestions(quizId!, tenantId!)
        const existingDbIds = (currentQuizData?.quiz_questions || []).map((q: any) => q.id)
        const newDbIds = existingQs.map((q) => q.id!)
        const deletedIds = existingDbIds.filter((id: string) => !newDbIds.includes(id))

        if (deletedIds.length > 0) {
          await Promise.all(
            deletedIds.map((id: string) => quizService.deleteQuizQuestion(id, tenantId!))
          )
        }

        for (const q of existingQs) {
          await quizService.updateQuizQuestion(
            q.id!,
            {
              text: q.text,
              question_type: q.question_type,
              points: q.points,
              explanation: q.explanation,
              order: q.order,
            },
            tenantId
          )
          await quizService.replaceQuestionOptions(
            q.id!,
            tenantId,
            q.options.map((o) => ({ text: o.text, is_correct: o.is_correct }))
          )
        }

        if (newQs.length > 0) {
          await Promise.all(
            newQs.map((q) =>
              quizService.addQuestionToQuiz(quizId!, tenantId!, {
                text: q.text,
                question_type: q.question_type,
                points: q.points,
                explanation: q.explanation || undefined,
                order: q.order,
                options: q.options.map((o) => ({ text: o.text, is_correct: o.is_correct })),
              })
            )
          )
        }

        if (targetStatus && (targetStatus === 'draft' || targetStatus === 'published')) {
          await quizService.setQuizStatus(quizId!, targetStatus, tenantId!)
          setValue('status', targetStatus)
        }

        await openEditQuiz(quizId!)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsSaving(false)
      }
    }

    // Call handleSubmit
    await handleSubmit(onSubmit)()
  }

  // ─── Delete Quiz ────────────────────────────────────────

  const handleDelete = async (quizId: string) => {
    if (!confirm('Hapus kuis ini? Aksi ini tidak bisa dibatalkan.')) return
    try {
      await quizService.deleteQuiz(quizId, tenantId!)
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const isPublished = watch('status') === 'published'

  // ─── No class selected ──────────────────────────────────

  if (!activeClassroomId) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Manajemen Kuis</h1>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-slate-500">Pilih kelas terlebih dahulu</p>
          <p className="text-sm mt-1 text-slate-400">Gunakan sidebar untuk memilih kelas aktif.</p>
        </div>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <QuizListView
        quizzes={quizzes}
        isLoading={isLoading}
        error={error}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        expandedQuizId={expandedQuizId}
        setExpandedQuizId={setExpandedQuizId}
        activeClass={activeClass}
        studentCount={studentCount}
        assignModalQuizId={assignModalQuizId}
        setAssignModalQuizId={setAssignModalQuizId}
        openNewQuiz={openNewQuiz}
        openEditQuiz={openEditQuiz}
        handleDelete={handleDelete}
        loadQuizzes={loadQuizzes}
      />
    )
  }

  return (
    <QuizEditorView
      methods={methods}
      editingQuizId={editingQuizId}
      isSaving={isSaving}
      isPublished={isPublished}
      error={error}
      setError={setError}
      showQuestionModal={showQuestionModal}
      setShowQuestionModal={setShowQuestionModal}
      handleSave={handleSave}
      setView={setView}
      loadQuizzes={loadQuizzes}
    />
  )
}
