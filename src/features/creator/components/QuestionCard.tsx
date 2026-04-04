/**
 * QuestionCard Component
 * Renders a single generated question with selection checkbox, edit, and delete controls.
 */

import { Pencil, Trash2 } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { AssignmentType, GeneratedQuestion } from '../types'

interface QuestionCardProps {
  question: GeneratedQuestion
  index: number
  questionType: AssignmentType
  selected: boolean
  onToggleSelect: (id: string) => void
  onEdit: (question: GeneratedQuestion) => void
  onDelete: (id: string) => void
}

export function QuestionCard({
  question,
  index,
  questionType,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: QuestionCardProps) {
  const options = question.options ?? []

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 p-4 rounded-2xl border transition-all group',
        selected
          ? 'border-blue-400 dark:border-blue-500 shadow-sm shadow-blue-100 dark:shadow-blue-900/30'
          : 'border-slate-200 dark:border-slate-700'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggleSelect(question.id)}
          className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: selected ? '#3b82f6' : '#94a3b8',
            backgroundColor: selected ? '#3b82f6' : 'transparent',
          }}
          aria-label={selected ? 'Batalkan pilihan' : 'Pilih soal'}
        >
          {selected && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 12 12"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Question number + text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-bold text-blue-500 shrink-0">{index + 1}.</span>
            {question.bloomLevel && (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full shrink-0">
                {question.bloomLevel}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
            {question.text}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            aria-label="Edit soal"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            aria-label="Hapus soal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quiz options */}
      {questionType === 'quiz' && options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
          {options.map((opt, j) => {
            const text = typeof opt === 'string' ? opt : opt.text
            const correctIdx =
              typeof question.answer === 'number'
                ? question.answer
                : question.correctAnswer
                  ? options.findIndex(
                      (o) => (typeof o === 'string' ? o : o.text) === question.correctAnswer
                    )
                  : -1
            const isCorrect = j === correctIdx

            return (
              <div
                key={j}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-medium border',
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                )}
              >
                {String.fromCharCode(65 + j)}. {text}
              </div>
            )
          })}
        </div>
      )}

      {/* Reading/Writing answer */}
      {questionType !== 'quiz' && question.answer && (
        <div className="ml-8 mt-2 p-3 bg-slate-50 dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            {questionType === 'reading' ? 'Poin Penting:' : 'Rubrik Penilaian:'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {String(question.answer)}
          </p>
        </div>
      )}

      {/* Explanation */}
      {questionType === 'quiz' && question.explanation && (
        <div className="ml-8 mt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            <span className="font-semibold not-italic">Pembahasan:</span> {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}
