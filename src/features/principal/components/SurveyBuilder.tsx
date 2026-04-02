// ==========================================================================
// SurveyBuilder — Modal untuk membuat/mengedit survey kepuasan
// Task 30.5
// ==========================================================================

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

import type {
  CreateSurveyInput,
  QuestionType,
  SatisfactionSurvey,
  SurveyAudience,
  SurveyQuestion,
} from '../types'

// ── Constants ──────────────────────────────────────────────────

const AUDIENCE_OPTIONS: Array<{ value: SurveyAudience; label: string }> = [
  { value: 'teachers', label: 'Guru' },
  { value: 'students', label: 'Siswa' },
  { value: 'parents', label: 'Orang Tua' },
  { value: 'all', label: 'Semua (Guru, Siswa, Orang Tua)' },
]

const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string; icon: string }> = [
  { value: 'rating', label: 'Rating 1–5', icon: '⭐' },
  { value: 'yesno', label: 'Ya / Tidak', icon: '✅' },
  { value: 'text', label: 'Teks Bebas', icon: '📝' },
]

const DEFAULT_TEMPLATE_QUESTIONS: Array<Omit<SurveyQuestion, 'id'>> = [
  { type: 'rating', text: 'Seberapa mudah platform EduSync digunakan?', required: true },
  { type: 'rating', text: 'Seberapa puas Anda dengan fitur yang tersedia?', required: true },
  {
    type: 'yesno',
    text: 'Apakah platform ini membantu proses belajar mengajar?',
    required: true,
  },
  { type: 'rating', text: 'Seberapa responsif tim dukungan teknis?', required: false },
  {
    type: 'text',
    text: 'Apa saran Anda untuk meningkatkan platform EduSync?',
    required: false,
  },
]

// ── Helper ─────────────────────────────────────────────────────

function newQuestion(type: QuestionType = 'rating'): SurveyQuestion {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    text: '',
    required: true,
  }
}

function generateFromTemplate(): SurveyQuestion[] {
  return DEFAULT_TEMPLATE_QUESTIONS.map((q) => ({
    ...q,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  }))
}

// ── Question Row ───────────────────────────────────────────────

interface QuestionRowProps {
  question: SurveyQuestion
  index: number
  onChange: (q: SurveyQuestion) => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}

function QuestionRow({
  question,
  index,
  onChange,
  onRemove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: QuestionRowProps) {
  const typeInfo = QUESTION_TYPE_OPTIONS.find((t) => t.value === question.type)

  return (
    <div className="flex gap-2 items-start p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      {/* Drag Handle / Order Buttons */}
      <div className="flex flex-col gap-1 pt-1">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 text-xs leading-none"
          title="Pindah ke atas"
        >
          ▲
        </button>
        <span className="text-xs text-slate-400 text-center">{index + 1}</span>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 text-xs leading-none"
          title="Pindah ke bawah"
        >
          ▼
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{typeInfo?.icon}</span>
          <Select
            value={question.type}
            onChange={(e) => onChange({ ...question, type: e.target.value as QuestionType })}
            className="text-xs"
            options={QUESTION_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
            selectSize="sm"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onChange({ ...question, required: e.target.checked })}
              className="rounded"
            />
            Wajib
          </label>
        </div>
        <Input
          placeholder={`Pertanyaan ${index + 1}...`}
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
        />
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm mt-1 flex-shrink-0"
        title="Hapus pertanyaan"
      >
        ✕
      </button>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────

export interface SurveyBuilderProps {
  open: boolean
  onClose: () => void
  survey?: SatisfactionSurvey | null // jika ada = edit mode
  onSave: (input: CreateSurveyInput) => Promise<void>
  onPublish?: (input: CreateSurveyInput) => Promise<void>
  isSaving: boolean
}

// ── Main Component ─────────────────────────────────────────────

export function SurveyBuilder({
  open,
  onClose,
  survey,
  onSave,
  onPublish,
  isSaving,
}: SurveyBuilderProps) {
  const isEdit = !!survey

  const [title, setTitle] = useState('')
  const [audience, setAudience] = useState<SurveyAudience>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [publishMode, setPublishMode] = useState(false)

  // Populate form when opening in edit mode
  useEffect(() => {
    if (open) {
      if (survey) {
        setTitle(survey.title)
        setAudience(survey.target_audience)
        setStartDate(survey.start_date ?? '')
        setEndDate(survey.end_date ?? '')
        setQuestions(survey.questions)
      } else {
        setTitle('')
        setAudience('all')
        setStartDate('')
        setEndDate('')
        setQuestions([])
      }
      setErrors({})
      setPublishMode(false)
    }
  }, [open, survey])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Judul survey wajib diisi.'
    if (questions.length === 0) newErrors.questions = 'Tambahkan minimal 1 pertanyaan.'
    questions.forEach((q, i) => {
      if (!q.text.trim()) newErrors[`q_${i}`] = `Teks pertanyaan ${i + 1} tidak boleh kosong.`
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const buildInput = (): CreateSurveyInput => ({
    title: title.trim(),
    target_audience: audience,
    questions,
    start_date: startDate || null,
    end_date: endDate || null,
  })

  const handleSaveDraft = async () => {
    if (!validate()) return
    setPublishMode(false)
    await onSave(buildInput())
    onClose()
  }

  const handlePublish = async () => {
    if (!validate()) return
    setPublishMode(true)
    if (onPublish) {
      await onPublish(buildInput())
    } else {
      await onSave(buildInput())
    }
    onClose()
  }

  const addQuestion = (type: QuestionType = 'rating') => {
    setQuestions((prev) => [...prev, newQuestion(type)])
  }

  const updateQuestion = (index: number, q: SurveyQuestion) => {
    setQuestions((prev) => prev.map((old, i) => (i === index ? q : old)))
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const copy = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= copy.length) return prev
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })
  }

  const loadTemplate = () => {
    setQuestions(generateFromTemplate())
    if (!title) setTitle('Survey Kepuasan Platform LMS')
  }

  return (
    <Modal open={open} onClose={onClose} size="2xl">
      <ModalHeader title={isEdit ? 'Edit Survey' : 'Buat Survey Baru'} onClose={onClose} />
      <ModalBody>
        <div className="space-y-5">
          {/* ── Survey Info ── */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Judul Survey <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Contoh: Survey Kepuasan Platform LMS Semester 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Responden
              </label>
              <Select
                value={audience}
                onChange={(e) => setAudience(e.target.value as SurveyAudience)}
                options={AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Selesai
                </label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Questions ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Pertanyaan <span className="text-red-500">*</span>{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({questions.length} pertanyaan)
                </span>
              </label>
              {questions.length === 0 && (
                <Button variant="ghost" size="sm" onClick={loadTemplate}>
                  📋 Gunakan Template Default
                </Button>
              )}
            </div>

            {errors.questions && <p className="text-xs text-red-500 mb-2">{errors.questions}</p>}

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <div key={q.id}>
                  <QuestionRow
                    question={q}
                    index={i}
                    onChange={(updated) => updateQuestion(i, updated)}
                    onRemove={() => removeQuestion(i)}
                    canMoveUp={i > 0}
                    canMoveDown={i < questions.length - 1}
                    onMoveUp={() => moveQuestion(i, 'up')}
                    onMoveDown={() => moveQuestion(i, 'down')}
                  />
                  {errors[`q_${i}`] && (
                    <p className="text-xs text-red-500 mt-1 ml-8">{errors[`q_${i}`]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Add question buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {QUESTION_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => addQuestion(t.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>{t.icon}</span>+ {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Preview Note ── */}
          {questions.length > 0 && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Preview:</strong> Survey &quot;{title || '(tanpa judul)'}&quot; akan dikirim
                ke <strong>{AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label}</strong>{' '}
                dengan {questions.length} pertanyaan.
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Batal
        </Button>
        <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving && !publishMode ? <Spinner size="sm" /> : null}
          Simpan Draft
        </Button>
        <Button variant="primary" onClick={handlePublish} disabled={isSaving}>
          {isSaving && publishMode ? <Spinner size="sm" /> : null}
          Publikasikan
        </Button>
      </ModalFooter>
    </Modal>
  )
}
