// ==========================================================================
// SurveyResponseForm — Formulir pengisian survei untuk responden
//
// Digunakan oleh guru, siswa, dan orang tua untuk mengisi survei aktif.
// Props:
//   surveyId: string — ID survei yang akan diisi
// ==========================================================================

import { CheckCircle, Loader2, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { getSurveyById, hasRespondedToSurvey, submitSurveyResponse } from '../api/surveyApi'
import type { SatisfactionSurvey, SurveyQuestion } from '../types'

// ── Props ───────────────────────────────────────────────────────

interface SurveyResponseFormProps {
  surveyId: string
  /** Callback opsional setelah submit berhasil */
  onSubmitted?: () => void
}

// ── Sub-komponen: Rating Stars ──────────────────────────────────

interface StarRatingProps {
  questionId: string
  value: number
  onChange: (questionId: string, value: number) => void
}

function StarRating({ questionId, value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex gap-1" role="group" aria-label="Penilaian bintang">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value)
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} bintang`}
            onClick={() => onChange(questionId, star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={[
              'p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded',
              filled ? 'text-amber-400 dark:text-amber-300' : 'text-slate-300 dark:text-slate-600',
            ].join(' ')}
          >
            <Star
              className="w-7 h-7"
              fill={filled ? 'currentColor' : 'none'}
              strokeWidth={filled ? 0 : 1.5}
            />
          </button>
        )
      })}
      {value > 0 && (
        <span className="ml-2 self-center text-sm font-medium text-amber-600 dark:text-amber-400">
          {value}/5
        </span>
      )}
    </div>
  )
}

// ── Sub-komponen: YesNo Buttons ─────────────────────────────────

interface YesNoButtonsProps {
  questionId: string
  value: boolean | null
  onChange: (questionId: string, value: boolean) => void
}

function YesNoButtons({ questionId, value, onChange }: YesNoButtonsProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange(questionId, true)}
        className={[
          'px-5 py-2 rounded-lg text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500',
          value === true
            ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500'
            : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:border-emerald-400',
        ].join(' ')}
      >
        Ya
      </button>
      <button
        type="button"
        onClick={() => onChange(questionId, false)}
        className={[
          'px-5 py-2 rounded-lg text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500',
          value === false
            ? 'bg-rose-600 border-rose-600 text-white dark:bg-rose-500 dark:border-rose-500'
            : 'bg-white border-slate-300 text-slate-700 hover:border-rose-400 hover:text-rose-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:border-rose-400',
        ].join(' ')}
      >
        Tidak
      </button>
    </div>
  )
}

// ── Sub-komponen: Question Item ─────────────────────────────────

interface QuestionItemProps {
  question: SurveyQuestion
  index: number
  answers: Record<string, string | number | boolean>
  onAnswer: (questionId: string, value: string | number | boolean) => void
}

function QuestionItem({ question, index, answers, onAnswer }: QuestionItemProps) {
  const currentValue = answers[question.id]

  return (
    <div className="py-5 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
        <span className="text-slate-400 dark:text-slate-500 mr-1.5">{index + 1}.</span>
        {question.text}
        {question.required && (
          <span className="ml-1 text-rose-500" aria-label="wajib diisi">
            *
          </span>
        )}
      </p>

      {question.type === 'rating' && (
        <StarRating
          questionId={question.id}
          value={typeof currentValue === 'number' ? currentValue : 0}
          onChange={onAnswer}
        />
      )}

      {question.type === 'yesno' && (
        <YesNoButtons
          questionId={question.id}
          value={typeof currentValue === 'boolean' ? currentValue : null}
          onChange={onAnswer}
        />
      )}

      {question.type === 'text' && (
        <textarea
          rows={3}
          placeholder="Tulis jawaban Anda di sini..."
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          className={[
            'w-full px-3 py-2 text-sm rounded-lg border resize-none',
            'bg-white dark:bg-slate-800',
            'text-slate-800 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'border-slate-300 dark:border-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            'transition-colors',
          ].join(' ')}
        />
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────

export function SurveyResponseForm({ surveyId, onSubmitted }: SurveyResponseFormProps) {
  const [survey, setSurvey] = useState<SatisfactionSurvey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [alreadyResponded, setAlreadyResponded] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Muat data survei dan cek status respons
  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [surveyData, responded] = await Promise.all([
          getSurveyById(surveyId),
          hasRespondedToSurvey(surveyId),
        ])
        if (cancelled) return
        setSurvey(surveyData)
        setAlreadyResponded(responded)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Gagal memuat survei.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [surveyId])

  const handleAnswer = (questionId: string, value: string | number | boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!survey) return

    // Validasi pertanyaan wajib
    const unanswered = survey.questions.filter((q) => {
      if (!q.required) return false
      const val = answers[q.id]
      if (val === undefined || val === null || val === '') return true
      return false
    })

    if (unanswered.length > 0) {
      setError(
        `Harap jawab semua pertanyaan wajib (${unanswered.length} pertanyaan belum dijawab).`
      )
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await submitSurveyResponse(surveyId, answers)
      setSubmitSuccess(true)
      setAlreadyResponded(true)
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim respons.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Loading State ───────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Memuat survei...</span>
      </div>
    )
  }

  // ── Error State ─────────────────────────────────────────────

  if (error && !survey) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-6 text-center">
        <p className="text-rose-700 dark:text-rose-400 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-rose-600 dark:text-rose-400 underline underline-offset-2 hover:no-underline"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p className="text-slate-500 dark:text-slate-400">Survei tidak ditemukan.</p>
      </div>
    )
  }

  // ── Survey Closed ───────────────────────────────────────────

  if (survey.status !== 'active') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-8 text-center">
        <p className="text-amber-700 dark:text-amber-400 font-semibold text-lg mb-1">
          Survei Tidak Tersedia
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Survei ini sudah ditutup atau belum aktif.
        </p>
      </div>
    )
  }

  // ── Already Responded / Success State ──────────────────────

  if (alreadyResponded || submitSuccess) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto mb-3" />
        <p className="text-emerald-800 dark:text-emerald-300 font-semibold text-lg mb-1">
          Terima kasih!
        </p>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Anda sudah mengisi survei ini. Respons Anda telah tercatat.
        </p>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────

  const audienceLabel: Record<string, string> = {
    teachers: 'Guru',
    students: 'Siswa',
    parents: 'Orang Tua',
    all: 'Semua',
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Header survei */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            Survei Kepuasan
          </span>
          {survey.target_audience && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {audienceLabel[survey.target_audience] ?? survey.target_audience}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-2">{survey.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Jawab semua pertanyaan di bawah ini dengan jujur. Tanda{' '}
          <span className="text-rose-500">*</span> menandakan pertanyaan wajib.
        </p>
      </div>

      {/* Daftar pertanyaan */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 px-5">
        {survey.questions.map((question, index) => (
          <QuestionItem
            key={question.id}
            question={question}
            index={index}
            answers={answers}
            onAnswer={handleAnswer}
          />
        ))}
      </div>

      {/* Error inline */}
      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-4 py-3">
          <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold',
            'bg-indigo-600 text-white',
            'hover:bg-indigo-700 active:bg-indigo-800',
            'dark:bg-indigo-500 dark:hover:bg-indigo-600',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'transition-colors',
          ].join(' ')}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Mengirim...' : 'Kirim Jawaban'}
        </button>
      </div>
    </form>
  )
}
