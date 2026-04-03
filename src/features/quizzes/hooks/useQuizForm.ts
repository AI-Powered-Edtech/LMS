import { useCallback, useState } from 'react'

import type { QuestionType, QuizMode } from '@/features/quizzes'
import type { QuizStatus } from '@/features/quizzes/types/quizzes.types'

interface QuizOption {
  id?: string
  text: string
  is_correct: boolean
}

export interface QuizQuestion {
  id?: string
  text: string
  order: number
  question_type: QuestionType
  points: number
  explanation: string | null
  tenant_id?: string
  options: QuizOption[]
}

export interface QuizFormData {
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

export function useQuizForm(initialForm: QuizFormData) {
  const [form, setForm] = useState<QuizFormData>(initialForm)

  const addQuestion = useCallback(() => {
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
  }, [])

  const updateQuestion = useCallback(
    <K extends keyof QuizQuestion>(idx: number, field: K, value: QuizQuestion[K]) => {
      setForm((prev) => {
        const qs = [...prev.questions]
        qs[idx] = { ...qs[idx], [field]: value }
        return { ...prev, questions: qs }
      })
    },
    []
  )

  const removeQuestion = useCallback((idx: number) => {
    setForm((prev) => {
      const qs = [...prev.questions]
      qs.splice(idx, 1)
      qs.forEach((q, i) => {
        q.order = i + 1
      })
      return { ...prev, questions: qs }
    })
  }, [])

  const updateQuestionType = useCallback((qIdx: number, newType: QuestionType) => {
    setForm((prev) => {
      const qs = [...prev.questions]
      const q = qs[qIdx]
      const hasOptions = q.options.some((o) => o.text.trim() !== '')
      const isToTextType = ['SHORT_ANSWER', 'ESSAY'].includes(newType)
      const isFromOptionType = ['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'].includes(q.question_type)

      if (isFromOptionType && isToTextType && hasOptions) {
        if (!confirm('Mengubah tipe soal ini akan menghapus semua opsi jawaban. Lanjutkan?')) {
          return prev
        }
      }

      qs[qIdx] = { ...q, question_type: newType }
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
      return { ...prev, questions: qs }
    })
  }, [])

  const addOption = useCallback((qIdx: number) => {
    setForm((prev) => {
      const qs = [...prev.questions]
      qs[qIdx].options.push({ text: 'Opsi Baru', is_correct: false })
      return { ...prev, questions: qs }
    })
  }, [])

  const updateOption = useCallback((qIdx: number, oIdx: number, text: string) => {
    setForm((prev) => {
      const qs = [...prev.questions]
      qs[qIdx].options[oIdx].text = text
      return { ...prev, questions: qs }
    })
  }, [])

  const removeOption = useCallback((qIdx: number, oIdx: number) => {
    setForm((prev) => {
      const qs = [...prev.questions]
      qs[qIdx].options.splice(oIdx, 1)
      return { ...prev, questions: qs }
    })
  }, [])

  const setCorrectOption = useCallback((qIdx: number, oIdx: number) => {
    setForm((prev) => {
      const qs = [...prev.questions]
      const qType = qs[qIdx].question_type
      if (qType === 'MULTIPLE_SELECT') {
        qs[qIdx].options[oIdx].is_correct = !qs[qIdx].options[oIdx].is_correct
      } else {
        qs[qIdx].options.forEach((o, i) => {
          o.is_correct = i === oIdx
        })
      }
      return { ...prev, questions: qs }
    })
  }, [])

  return {
    form,
    setForm,
    addQuestion,
    updateQuestion,
    removeQuestion,
    updateQuestionType,
    addOption,
    updateOption,
    removeOption,
    setCorrectOption,
  }
}
