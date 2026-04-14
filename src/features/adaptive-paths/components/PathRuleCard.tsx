import { ArrowRight, Edit2, Power, Trash2 } from 'lucide-react'

import type { PathRule } from '../types'
import { CONDITION_LABELS } from './PathConditionPicker'

interface PathRuleCardProps {
  rule: PathRule
  sourceLessonTitle: string
  targetLessonTitle: string
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

export function PathRuleCard({
  rule,
  sourceLessonTitle,
  targetLessonTitle,
  onEdit,
  onDelete,
  onToggleActive,
}: PathRuleCardProps) {
  const conditionLabel = CONDITION_LABELS[rule.condition_type] ?? rule.condition_type

  let conditionDetail = ''
  if (rule.condition_type === 'quiz_score_below' || rule.condition_type === 'quiz_score_above') {
    conditionDetail = ` (${rule.condition_value.threshold ?? 70}%)`
  } else if (rule.condition_type === 'time_spent_below') {
    const mins = Math.floor((rule.condition_value.min_seconds ?? 300) / 60)
    const secs = (rule.condition_value.min_seconds ?? 300) % 60
    conditionDetail = ` (${mins}m ${secs}s)`
  }

  return (
    <div
      className={`relative rounded-2xl border p-4 transition-all ${
        rule.is_active
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
      }`}
    >
      {/* Priority badge */}
      <div className="absolute top-3 right-3">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
          P{rule.priority}
        </span>
      </div>

      {/* Label */}
      {rule.label && (
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-3 pr-12 truncate">
          {rule.label}
        </p>
      )}

      {/* Flow: source → condition → target */}
      <div className="flex items-center gap-2 flex-wrap pr-10">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg truncate max-w-[140px]">
          {sourceLessonTitle}
        </span>

        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />

        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
          {conditionLabel}
          {conditionDetail}
        </span>

        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />

        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg truncate max-w-[140px]">
          {targetLessonTitle}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          aria-label="Edit aturan"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>

        <button
          onClick={onToggleActive}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors px-2 py-1 rounded-lg ${
            rule.is_active
              ? 'text-emerald-600 dark:text-emerald-400 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          }`}
          aria-label={rule.is_active ? 'Nonaktifkan aturan' : 'Aktifkan aturan'}
        >
          <Power className="w-3.5 h-3.5" />
          {rule.is_active ? 'Aktif' : 'Nonaktif'}
        </button>

        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label="Hapus aturan"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Hapus
        </button>
      </div>
    </div>
  )
}
