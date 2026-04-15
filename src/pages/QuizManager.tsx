import { HelpCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { useClassroom } from '@/src/features/classroom/hooks/useClassroomQueries'
import { type QuestionType, type QuizMode, quizService } from '@/src/features/quizzes'
import { QuizEditorView } from '@/src/features/quizzes/components/QuizEditorView'
import { QuizListView } from '@/src/features/quizzes/components/QuizListView'
import { QuizStatus } from '@/src/features/quizzes/types/quizzes.types'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { apiFetch } from '@/src/lib/api'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

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

interface QuizQuestion {
  id?: string
  text: string
  order: number
  question_type: QuestionType
  points: number
  explanation: string | null
  tenant_id?: string
  options: { id?: string; text: string; is_correct: boolean }[]
}

interface QuizFormData {
  id?: string
  title: string
  instructions: string
  mode: QuizMode
  time_limit_minutes: number | null
  max_attempts: number
  passing_score: number
  shuffle_questions: boolean
  shuffle_options: boolean
  show_correct_answers: boolean
  available_from: string
  due_at: string
  status: QuizStatus
  questions: QuizQuestion[]
}

const emptyForm: QuizFormData = {
  title: '',
  instructions: '',
  mode: 'graded',
  time_limit_minutes: 15,
  max_attempts: 3,
  passing_score: 70,
  shuffle_questions: false,
  shuffle_options: false,
  show_correct_answers: false,
  available_from: '',
  due_at: '',
  status: 'draft',
  questions: [],
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function QuizManager() {
  usePageTitle('Manajemen Kuis')
  const { activeClassroomId, classrooms } = useClassroom()
  const { tenantId } = useAuth()

  const activeClass = classrooms.find((c) => c.id === activeClassroomId)

  const [studentCount, _setStudentCount] = useState<number>(0)

  useEffect(() => {
    if (activeClassroomId && tenantId) {
      apiFetch('/enrollments')
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
  const [form, setForm] = useState<QuizFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)

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
    setForm(emptyForm)
    setEditingQuizId(null)
    setView('editor')
  }

  const openEditQuiz = async (quizId: string) => {
    setIsLoading(true)
    try {
      const data = await quizService.getQuizWithQuestions(quizId, tenantId!)
      if (!data) throw new Error('Quiz not found')

      setForm({
        id: data.id,
        title: data.title || '',
        instructions: data.instructions || '',
        mode: data.mode || 'graded',
        time_limit_minutes: data.time_limit_minutes,
        max_attempts: data.max_attempts || 3,
        passing_score: data.passing_score || 70,
        shuffle_questions: data.shuffle_questions || false,
        shuffle_options: data.shuffle_options || false,
        show_correct_answers: data.show_correct_answers || false,
        available_from: data.available_from || '',
        due_at: data.available_until || '',
        status: data.status || 'draft',
        questions: (data.quiz_questions || []).map(
          (q: {
            id: string
            text: string
            order: number
            question_type?: string
            points?: number
            explanation?: string
            tenant_id?: string
            quiz_options?: Array<{ id: string; text: string; is_correct: boolean }>
          }) => ({
            id: q.id,
            text: q.text,
            order: q.order,
            question_type: q.question_type || 'MCQ',
            points: q.points ?? 1,
            explanation: q.explanation || null,
            tenant_id: q.tenant_id,
            options: (q.quiz_options || []).map((o) => ({
              id: o.id,
              text: o.text,
              is_correct: o.is_correct,
            })),
          })
        ),
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
    if (!activeClassroomId || !tenantId) return
    // Prevent publishing without questions
    if (targetStatus === 'published' && form.questions.length === 0) {
      setError('Tidak bisa publish kuis tanpa soal. Tambahkan minimal 1 soal.')
      return
    }
    setIsSaving(true)
    setError(null)

    const status = targetStatus || form.status

    try {
      let quizId = editingQuizId

      if (!quizId) {
        // Create new quiz
        const created = await quizService.createQuiz({
          title: form.title || 'Kuis Baru',
          class_id: activeClassroomId,
          tenant_id: tenantId,
          instructions: form.instructions,
          mode: form.mode,
          time_limit_minutes: form.time_limit_minutes || undefined,
          max_attempts: form.max_attempts,
          passing_score: form.passing_score,
          shuffle_questions: form.shuffle_questions,
          shuffle_options: form.shuffle_options,
          show_correct_answers: form.show_correct_answers,
          available_from: form.available_from || null,
          due_at: form.due_at || null,
        })
        quizId = created.id
        setEditingQuizId(quizId)
        setForm((prev) => ({ ...prev, id: quizId! }))
      } else {
        // Update existing quiz settings
        await quizService.updateQuiz(
          quizId,
          {
            title: form.title,
            instructions: form.instructions || null,
            mode: form.mode,
            time_limit_minutes: form.time_limit_minutes,
            max_attempts: form.max_attempts,
            passing_score: form.passing_score,
            shuffle_questions: form.shuffle_questions,
            shuffle_options: form.shuffle_options,
            show_correct_answers: form.show_correct_answers,
            available_from: form.available_from || null,
            available_until: form.due_at || null,
            status,
          },
          tenantId
        )
      }

      // Sync questions: delete removed, update existing, add new
      const existingQs = form.questions.filter((q) => q.id)
      const newQs = form.questions.filter((q) => !q.id)

      // Update existing questions sequentially to avoid race conditions
      // where updateQuizQuestion and replaceQuestionOptions conflict
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

      // Add new questions in parallel
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

      // Set status if publishing
      if (targetStatus && (targetStatus === 'draft' || targetStatus === 'published')) {
        await quizService.setQuizStatus(quizId!, targetStatus, tenantId!)
        setForm((prev) => ({ ...prev, status: targetStatus }))
      }

      // Reload editor with fresh data
      await openEditQuiz(quizId!)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
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

  // ─── Question CRUD (local state) ────────────────────────

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: '',
          order: prev.questions.length + 1,
          question_type: 'MCQ' as QuestionType,
          points: 1,
          explanation: null,
          options: [
            { text: 'Opsi A', is_correct: true },
            { text: 'Opsi B', is_correct: false },
          ],
        },
      ],
    }))
  }

  const updateQuestion = <K extends keyof QuizQuestion>(
    idx: number,
    field: K,
    value: QuizQuestion[K]
  ) => {
    const qs = [...form.questions]
    qs[idx][field] = value
    setForm({ ...form, questions: qs })
  }

  const removeQuestion = (idx: number) => {
    const qs = [...form.questions]
    qs.splice(idx, 1)
    // Reorder
    qs.forEach((q, i) => {
      q.order = i + 1
    })
    setForm({ ...form, questions: qs })
  }

  const updateQuestionType = (qIdx: number, newType: QuestionType) => {
    const q = form.questions[qIdx]
    const hasOptions = q.options.some((o) => o.text.trim() !== '')
    const isToTextType = ['SHORT_ANSWER', 'ESSAY'].includes(newType)
    const isFromOptionType = ['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'].includes(q.question_type)

    if (isFromOptionType && isToTextType && hasOptions) {
      if (!confirm('Mengubah tipe soal ini akan menghapus semua opsi jawaban. Lanjutkan?')) {
        return
      }
    }

    const qs = [...form.questions]
    qs[qIdx].question_type = newType
    if (newType === 'TRUE_FALSE') {
      qs[qIdx].options = [
        { text: 'Benar', is_correct: true },
        { text: 'Salah', is_correct: false },
      ]
    } else if (newType === 'SHORT_ANSWER' || newType === 'ESSAY') {
      qs[qIdx].options = []
    } else if (qs[qIdx].options.length === 0) {
      qs[qIdx].options = [
        { text: 'Opsi A', is_correct: true },
        { text: 'Opsi B', is_correct: false },
      ]
    }
    setForm({ ...form, questions: qs })
  }

  const addOption = (qIdx: number) => {
    const qs = [...form.questions]
    qs[qIdx].options.push({ text: 'Opsi Baru', is_correct: false })
    setForm({ ...form, questions: qs })
  }

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    const qs = [...form.questions]
    qs[qIdx].options[oIdx].text = text
    setForm({ ...form, questions: qs })
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    const qs = [...form.questions]
    qs[qIdx].options.splice(oIdx, 1)
    setForm({ ...form, questions: qs })
  }

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    const qs = [...form.questions]
    const qType = qs[qIdx].question_type
    if (qType === 'MULTIPLE_SELECT') {
      qs[qIdx].options[oIdx].is_correct = !qs[qIdx].options[oIdx].is_correct
    } else {
      qs[qIdx].options.forEach((o, i) => {
        o.is_correct = i === oIdx
      })
    }
    setForm({ ...form, questions: qs })
  }

  const isPublished = form.status === 'published'

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

  // ─── QUIZ LIST VIEW ─────────────────────────────────────

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

  // ─── QUIZ EDITOR VIEW ───────────────────────────────────

  return (
    <QuizEditorView
      form={form}
      setForm={setForm}
      editingQuizId={editingQuizId}
      isSaving={isSaving}
      isPublished={isPublished}
      error={error}
      setError={setError}
      showQuestionModal={showQuestionModal}
      setShowQuestionModal={setShowQuestionModal}
      handleSave={handleSave}
      addQuestion={addQuestion}
      updateQuestion={updateQuestion}
      removeQuestion={removeQuestion}
      updateQuestionType={updateQuestionType}
      addOption={addOption}
      updateOption={updateOption}
      removeOption={removeOption}
      setCorrectOption={setCorrectOption}
      setView={setView}
      loadQuizzes={loadQuizzes}
    />
  )
}
