import { CheckCircle, Edit, FileText, List, Tag, Trash2, Type } from 'lucide-react'
import React from 'react'

import { QuestionBankItem } from '@/features/question-bank/api/questionBankService'

interface QuestionCardProps {
  question: QuestionBankItem
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onSelect?: (id: string) => void
  selectable?: boolean
  selected?: boolean
}

const getDifficultyLabel = (level: number) => {
  switch (level) {
    case 1:
      return { text: 'Sangat Mudah', color: 'bg-green-100 text-green-700' }
    case 2:
      return { text: 'Mudah', color: 'bg-emerald-100 text-emerald-700' }
    case 3:
      return { text: 'Sedang', color: 'bg-yellow-100 text-yellow-700' }
    case 4:
      return { text: 'Sulit', color: 'bg-orange-100 text-orange-700' }
    case 5:
      return { text: 'Sangat Sulit', color: 'bg-red-100 text-red-700' }
    default:
      return { text: 'Menengah', color: 'bg-slate-100 text-slate-700' }
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'MCQ':
      return <List className="w-4 h-4" />
    case 'TRUE_FALSE':
      return <CheckCircle className="w-4 h-4" />
    case 'SHORT_ANSWER':
      return <Type className="w-4 h-4" />
    case 'ESSAY':
      return <FileText className="w-4 h-4" />
    default:
      return <FileText className="w-4 h-4" />
  }
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onEdit,
  onDelete,
  onSelect,
  selectable = false,
  selected = false,
}) => {
  const defaultDiff = getDifficultyLabel(question.difficulty_level || 3)

  return (
    <div
      className={`bg-white dark:bg-slate-800 border rounded-xl overflow-hidden shadow-sm transition-all ${
        selected
          ? 'border-indigo-500 ring-1 ring-indigo-500'
          : 'border-slate-200 dark:border-slate-700 hover:shadow-md'
      }`}
    >
      <div className="p-5 flex gap-4">
        {selectable && (
          <div className="pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect && onSelect(question.id)}
              className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800">
              {getTypeIcon(question.question_type)}
              {question.question_type.replace('_', ' ')}
            </span>

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${defaultDiff.color.replace('bg-', 'border-').replace('text-', 'border-opacity-30 text-')} ${defaultDiff.color}`}
            >
              {defaultDiff.text}
            </span>

            {question.tags && question.tags.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto text-slate-500">
                <Tag className="w-3.5 h-3.5" />
                <div className="flex gap-1">
                  {question.tags.map((tag, idx) => (
                    <span
                      key={`${question.id}-tag-${idx}`}
                      className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-base line-clamp-2 mt-1 mb-3">
            {question.question_text}
          </h3>

          {question.options && question.options.length > 0 && question.question_type === 'MCQ' && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.options.map((opt, i) => (
                <div
                  key={`opt-${i}`}
                  className={`text-sm px-3 py-2 border rounded-md line-clamp-1 ${
                    opt.is_correct
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt.option_text}
                </div>
              ))}
            </div>
          )}
        </div>

        {!selectable && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(question.id)}
                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
                title="Edit Soal"
                aria-label="Edit soal"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(question.id)}
                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-colors mt-auto"
                title="Hapus Soal"
                aria-label="Hapus soal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
