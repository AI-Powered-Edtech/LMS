import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import type { ConditionType, LessonNode, PathRule, PathRuleInsert } from '../types'
import { PathConditionPicker } from './PathConditionPicker'

interface PathRuleEditorProps {
  courseId: string
  lessons: LessonNode[]
  rule?: PathRule
  onSave: (rule: PathRuleInsert) => void
  onClose: () => void
  isSaving?: boolean
}

const SCORE_CONDITIONS: ConditionType[] = [
  'quiz_score_below',
  'quiz_score_above',
  'assignment_score_below',
]
const TIME_CONDITIONS: ConditionType[] = ['time_spent_below']

const DEFAULT_FORM: PathRuleInsert = {
  course_id: '',
  source_lesson_id: '',
  condition_type: 'quiz_score_below',
  condition_value: { threshold: 70 },
  target_lesson_id: '',
  priority: 0,
  is_active: true,
  label: '',
  updated_at: new Date().toISOString(),
} as unknown as PathRuleInsert

export function PathRuleEditor({
  courseId,
  lessons,
  rule,
  onSave,
  onClose,
  isSaving = false,
}: PathRuleEditorProps) {
  const [form, setForm] = useState<PathRuleInsert>(() => {
    if (rule) {
      const { id: _id, tenant_id: _t, created_by: _c, created_at: _ca, ...rest } = rule
      return rest
    }
    return { ...DEFAULT_FORM, course_id: courseId }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when rule prop changes
  useEffect(() => {
    if (rule) {
      const { id: _id, tenant_id: _t, created_by: _c, created_at: _ca, ...rest } = rule
      setForm(rest)
    } else {
      setForm({ ...DEFAULT_FORM, course_id: courseId })
    }
    setErrors({})
  }, [rule, courseId])

  const showScoreField = SCORE_CONDITIONS.includes(form.condition_type)
  const showTimeField = TIME_CONDITIONS.includes(form.condition_type)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.source_lesson_id) newErrors.source_lesson_id = 'Pilih pelajaran sumber.'
    if (!form.target_lesson_id) newErrors.target_lesson_id = 'Pilih pelajaran target.'
    if (form.source_lesson_id === form.target_lesson_id) {
      newErrors.target_lesson_id = 'Pelajaran sumber dan target tidak boleh sama.'
    }
    if (showScoreField) {
      const t = form.condition_value.threshold
      if (t === undefined || t === null || t < 0 || t > 100) {
        newErrors.threshold = 'Threshold harus antara 0 dan 100.'
      }
    }
    if (showTimeField) {
      const s = form.condition_value.min_seconds
      if (s === undefined || s === null || s < 0) {
        newErrors.min_seconds = 'Waktu minimum tidak boleh negatif.'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSave({ ...form, course_id: courseId })
  }

  const inputClass =
    'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all'

  const labelClass =
    'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rule-editor-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2
              id="rule-editor-title"
              className="text-lg font-black text-slate-800 dark:text-slate-100"
            >
              {rule ? 'Edit Aturan Jalur' : 'Tambah Aturan Jalur'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Tutup editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Source Lesson */}
            <div>
              <label htmlFor="source-lesson" className={labelClass}>
                Pelajaran Sumber
              </label>
              <select
                id="source-lesson"
                value={form.source_lesson_id}
                onChange={(e) => setForm((f) => ({ ...f, source_lesson_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">-- Pilih pelajaran --</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.module_title}] {l.title}
                  </option>
                ))}
              </select>
              {errors.source_lesson_id && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.source_lesson_id}
                </p>
              )}
            </div>

            {/* Condition */}
            <div>
              <label htmlFor="condition-type" className={labelClass}>
                Kondisi
              </label>
              <PathConditionPicker
                value={form.condition_type}
                onChange={(v) => {
                  // Reset condition value when type changes
                  const newVal = SCORE_CONDITIONS.includes(v)
                    ? { threshold: 70 }
                    : TIME_CONDITIONS.includes(v)
                      ? { min_seconds: 300 }
                      : {}
                  setForm((f) => ({ ...f, condition_type: v, condition_value: newVal }))
                }}
              />
            </div>

            {/* Threshold (score conditions) */}
            {showScoreField && (
              <div>
                <label htmlFor="threshold" className={labelClass}>
                  Nilai Threshold (%)
                </label>
                <input
                  id="threshold"
                  type="number"
                  min={0}
                  max={100}
                  value={form.condition_value.threshold ?? 70}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      condition_value: { ...f.condition_value, threshold: Number(e.target.value) },
                    }))
                  }
                  className={inputClass}
                  placeholder="0 – 100"
                />
                {errors.threshold && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.threshold}</p>
                )}
              </div>
            )}

            {/* Min seconds (time condition) */}
            {showTimeField && (
              <div>
                <label htmlFor="min-seconds" className={labelClass}>
                  Waktu Minimum (detik)
                </label>
                <input
                  id="min-seconds"
                  type="number"
                  min={0}
                  value={form.condition_value.min_seconds ?? 300}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      condition_value: {
                        ...f.condition_value,
                        min_seconds: Number(e.target.value),
                      },
                    }))
                  }
                  className={inputClass}
                  placeholder="Contoh: 300"
                />
                {errors.min_seconds && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {errors.min_seconds}
                  </p>
                )}
              </div>
            )}

            {/* Target Lesson */}
            <div>
              <label htmlFor="target-lesson" className={labelClass}>
                Pelajaran Target
              </label>
              <select
                id="target-lesson"
                value={form.target_lesson_id}
                onChange={(e) => setForm((f) => ({ ...f, target_lesson_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">-- Pilih pelajaran --</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.module_title}] {l.title}
                    {l.is_remedial ? ' (Remedial)' : ''}
                  </option>
                ))}
              </select>
              {errors.target_lesson_id && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.target_lesson_id}
                </p>
              )}
            </div>

            {/* Label */}
            <div>
              <label htmlFor="rule-label" className={labelClass}>
                Label Aturan
              </label>
              <input
                id="rule-label"
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
                placeholder="Contoh: Ke materi remedial jika nilai kuis rendah"
              />
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className={labelClass}>
                Prioritas (lebih tinggi = dievaluasi lebih dulu)
              </label>
              <input
                id="priority"
                type="number"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className={inputClass}
                placeholder="0"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between py-1">
              <span className={labelClass.replace('mb-1.5', 'mb-0')}>Aktif</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  form.is_active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    form.is_active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="path-rule-form"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Menyimpan...' : rule ? 'Simpan Perubahan' : 'Tambah Aturan'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
