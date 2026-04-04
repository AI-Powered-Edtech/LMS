/**
 * EditQuestionModal Component
 * Modal dialog for editing a generated question's text, options, and answer.
 */

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/utils/cn'

import type { AssignmentType, GeneratedQuestion } from '../types'

interface EditQuestionModalProps {
  open: boolean
  onClose: () => void
  question: GeneratedQuestion | null
  questionType: AssignmentType
  onSave: (updated: GeneratedQuestion) => void
}

export function EditQuestionModal({
  open,
  onClose,
  question,
  questionType,
  onSave,
}: EditQuestionModalProps) {
  const [text, setText] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [correctIdx, setCorrectIdx] = useState<number>(0)
  const [answer, setAnswer] = useState<string>('')
  const [explanation, setExplanation] = useState('')

  // Sync state whenever question prop changes
  useEffect(() => {
    if (!question) return
    setText(question.text ?? '')
    setExplanation(question.explanation ?? '')

    if (questionType === 'quiz') {
      const opts = (question.options ?? []).map((o) => (typeof o === 'string' ? o : o.text))
      setOptions(opts)
      const ci =
        typeof question.answer === 'number'
          ? question.answer
          : opts.findIndex((o) => o === question.correctAnswer || o === String(question.answer))
      setCorrectIdx(ci >= 0 ? ci : 0)
    } else {
      setAnswer(String(question.answer ?? ''))
    }
  }, [question, questionType])

  if (!open || !question) return null

  const handleOptionChange = (i: number, val: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)))
  }

  const handleSave = () => {
    const updated: GeneratedQuestion = {
      ...question,
      text,
      explanation: explanation || undefined,
    }

    if (questionType === 'quiz') {
      updated.options = options.map((o, i) => ({ id: String(i), text: o }))
      updated.answer = correctIdx
      updated.correctAnswer = options[correctIdx] ?? ''
    } else {
      updated.answer = answer
    }

    onSave(updated)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit soal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Soal</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Question text */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {questionType === 'writing' ? 'Topik' : 'Pertanyaan'}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Tulis pertanyaan di sini..."
            />
          </div>

          {/* Quiz: options + correct answer */}
          {questionType === 'quiz' && options.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                Pilihan Jawaban{' '}
                <span className="text-xs font-normal text-slate-400">
                  (klik radio untuk jawaban benar)
                </span>
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct-answer"
                      checked={correctIdx === i}
                      onChange={() => setCorrectIdx(i)}
                      className="accent-blue-600 w-4 h-4 shrink-0"
                      aria-label={`Jadikan opsi ${String.fromCharCode(65 + i)} sebagai jawaban benar`}
                    />
                    <div
                      className={cn(
                        'flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border text-sm transition-colors',
                        correctIdx === i
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'
                      )}
                    >
                      <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        className="flex-1 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reading/Writing: answer text */}
          {questionType !== 'quiz' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {questionType === 'reading' ? 'Poin Penting / Kunci Jawaban' : 'Rubrik Penilaian'}
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Isi jawaban atau rubrik penilaian..."
              />
            </div>
          )}

          {/* Explanation (quiz only) */}
          {questionType === 'quiz' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Pembahasan <span className="text-xs font-normal text-slate-400">(opsional)</span>
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tambahkan pembahasan (opsional)..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim()}
            className={cn(
              'flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors',
              text.trim()
                ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            )}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
