import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import React from 'react'

import { QuestionSearchModal } from '@/src/features/question-bank/components/QuestionSearchModal'
import { type QuestionType, type QuizMode } from '@/src/features/quizzes'
import { QuizStatus } from '@/src/features/quizzes/types/quizzes.types'
import { cn } from '@/src/utils/cn'

// ─────────────────────────────────────────────────────────
// Types (internal to quiz editor)
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const questionTypeLabels: Record<string, string> = {
  MCQ: 'Pilihan Ganda',
  TRUE_FALSE: 'Benar/Salah',
  MULTIPLE_SELECT: 'Pilih Beberapa',
  SHORT_ANSWER: 'Jawaban Singkat',
  ESSAY: 'Esai',
}

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────

export interface QuizEditorViewProps {
  form: QuizFormData
  setForm: React.Dispatch<React.SetStateAction<QuizFormData>>
  editingQuizId: string | null
  isSaving: boolean
  isPublished: boolean
  error: string | null
  setError: (err: string | null) => void
  showQuestionModal: boolean
  setShowQuestionModal: (show: boolean) => void
  handleSave: (targetStatus?: QuizStatus) => void
  addQuestion: () => void
  updateQuestion: <K extends keyof QuizQuestion>(
    idx: number,
    field: K,
    value: QuizQuestion[K]
  ) => void
  removeQuestion: (idx: number) => void
  updateQuestionType: (qIdx: number, newType: QuestionType) => void
  addOption: (qIdx: number) => void
  updateOption: (qIdx: number, oIdx: number, text: string) => void
  removeOption: (qIdx: number, oIdx: number) => void
  setCorrectOption: (qIdx: number, oIdx: number) => void
  setView: (view: 'list' | 'editor') => void
  loadQuizzes: () => void
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function QuizEditorView({
  form,
  setForm,
  editingQuizId,
  isSaving,
  isPublished,
  error,
  setError,
  showQuestionModal,
  setShowQuestionModal,
  handleSave,
  addQuestion,
  updateQuestion,
  removeQuestion,
  updateQuestionType,
  addOption,
  updateOption,
  removeOption,
  setCorrectOption,
  setView,
  loadQuizzes,
}: QuizEditorViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-6 lg:px-8">
      {/* Editor Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView('list')
              loadQuizzes()
            }}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-xl text-slate-900 dark:text-white">
              {editingQuizId ? 'Edit Kuis' : 'Buat Kuis Baru'}
            </h2>
            {isPublished && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                <CheckCircle className="w-3 h-3" />
                Published
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Save className="w-3.5 h-3.5" />
            Simpan Draft
          </button>
          <button
            onClick={() => handleSave(isPublished ? 'draft' : 'published')}
            disabled={isSaving}
            className={cn(
              'px-4 py-2 text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5',
              isPublished
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm'
            )}
          >
            {isPublished ? 'Kembalikan ke Draft' : 'Publish Kuis'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quiz Settings */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Pengaturan Kuis
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Judul Kuis</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            disabled={isPublished}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 text-sm"
            placeholder="Masukkan judul kuis..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Instruksi</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            disabled={isPublished}
            rows={2}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60 text-sm"
            placeholder="Instruksi pengerjaan kuis..."
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mode</label>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as QuizMode })}
              disabled={isPublished}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="practice">Latihan</option>
              <option value="graded">Penilaian</option>
              <option value="exam">Ujian</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Waktu (menit)</label>
            <input
              type="number"
              min="0"
              max="300"
              value={form.time_limit_minutes || ''}
              onChange={(e) =>
                setForm({ ...form, time_limit_minutes: parseInt(e.target.value) || null })
              }
              disabled={isPublished}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              placeholder="0 = tanpa batas"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Maks. Percobaan</label>
            <input
              type="number"
              min="1"
              max="10"
              value={form.max_attempts}
              onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })}
              disabled={isPublished}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nilai Lulus (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.passing_score}
              onChange={(e) => setForm({ ...form, passing_score: parseInt(e.target.value) || 0 })}
              disabled={isPublished}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              { key: 'shuffle_questions' as const, label: 'Acak soal' },
              { key: 'shuffle_options' as const, label: 'Acak opsi' },
              { key: 'show_correct_answers' as const, label: 'Tampilkan jawaban benar' },
            ] as const
          ).map((item) => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form[item.key as keyof QuizFormData] as boolean}
                onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                disabled={isPublished}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-xs text-slate-600 font-medium">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daftar Soal
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({form.questions.length} soal)
            </span>
          </h3>
          {!isPublished && (
            <div className="flex items-center gap-2">
              {editingQuizId && (
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" /> Bank Soal
                </button>
              )}
              <button
                type="button"
                onClick={addQuestion}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Soal
              </button>
            </div>
          )}
        </div>

        {form.questions.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Belum ada soal.</p>
            <p className="text-xs text-slate-400 mt-1">
              Klik "Tambah Soal" untuk mulai membuat pertanyaan.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {form.questions.map((q, qIdx) => (
              <div
                key={q.id || `new-${qIdx}`}
                className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3"
              >
                {/* Question header */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {qIdx + 1}
                  </span>
                  <select
                    value={q.question_type}
                    onChange={(e) => updateQuestionType(qIdx, e.target.value as QuestionType)}
                    disabled={isPublished}
                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:opacity-60"
                  >
                    {Object.entries(questionTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={q.points}
                    onChange={(e) => updateQuestion(qIdx, 'points', parseInt(e.target.value) || 1)}
                    disabled={isPublished}
                    className="w-14 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    title="Poin"
                  />
                  <span className="text-[10px] text-slate-400">poin</span>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                    disabled={isPublished}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm disabled:opacity-60"
                    placeholder="Tulis pertanyaan di sini..."
                  />
                  {!isPublished && (
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Options */}
                {q.question_type !== 'SHORT_ANSWER' && q.question_type !== 'ESSAY' && (
                  <div className="pl-8 space-y-2">
                    {q.question_type === 'MULTIPLE_SELECT' && (
                      <p className="text-[10px] text-slate-400 italic">
                        Klik untuk toggle jawaban benar (bisa lebih dari 1)
                      </p>
                    )}
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          onClick={() => !isPublished && setCorrectOption(qIdx, oIdx)}
                          disabled={isPublished}
                          className={cn(
                            'w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors',
                            q.question_type === 'MULTIPLE_SELECT' ? 'rounded' : 'rounded-full',
                            opt.is_correct
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 bg-white hover:border-emerald-400',
                            isPublished && 'cursor-not-allowed'
                          )}
                        >
                          {opt.is_correct && (
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="currentColor"
                              viewBox="0 0 12 12"
                            >
                              <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7-1-0.5z" />
                            </svg>
                          )}
                        </button>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          disabled={isPublished || q.question_type === 'TRUE_FALSE'}
                          className={cn(
                            'flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400 transition-colors',
                            opt.is_correct
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-white border-slate-200',
                            (isPublished || q.question_type === 'TRUE_FALSE') &&
                              'opacity-60 cursor-not-allowed'
                          )}
                        />
                        {!isPublished &&
                          q.options.length > 2 &&
                          q.question_type !== 'TRUE_FALSE' && (
                            <button
                              onClick={() => removeOption(qIdx, oIdx)}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                      </div>
                    ))}
                    {!isPublished && q.question_type !== 'TRUE_FALSE' && (
                      <button
                        onClick={() => addOption(qIdx)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Tambah Opsi
                      </button>
                    )}
                  </div>
                )}

                {/* Text type hint */}
                {(q.question_type === 'SHORT_ANSWER' || q.question_type === 'ESSAY') && (
                  <div className="pl-8">
                    <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-dashed border-slate-200">
                      {q.question_type === 'SHORT_ANSWER'
                        ? '🖊️ Siswa akan mengetik jawaban singkat (dinilai manual)'
                        : '📝 Siswa akan menulis esai (dinilai manual)'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isPublished && (
          <p className="text-xs text-center text-slate-400 pb-2">
            Kuis sudah dipublish. Kembalikan ke Draft untuk mengedit soal.
          </p>
        )}
      </div>

      {/* Question Bank Modal */}
      {editingQuizId && (
        <QuestionSearchModal
          quizId={editingQuizId}
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          onAddSuccess={(question) => {
            setForm((prev) => ({
              ...prev,
              questions: [
                ...prev.questions,
                {
                  id: question.id,
                  text: question.question_text,
                  order: prev.questions.length + 1,
                  question_type: question.question_type as QuestionType,
                  points: 1,
                  explanation: question.explanation || null,
                  options: (question.options || []).map(
                    (o: { option_text: string; is_correct: boolean }) => ({
                      text: o.option_text,
                      is_correct: o.is_correct,
                    })
                  ),
                },
              ],
            }))
            setShowQuestionModal(false)
          }}
        />
      )}
    </div>
  )
}
