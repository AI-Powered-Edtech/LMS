import { HelpCircle, Plus, Search, Trash2 } from 'lucide-react'

import { EmptyState } from '@/components/ui'
import type { QuizBlockData } from '@/features/courses/api/builder/quizBuilderService'
import type { QuestionType } from '@/features/quizzes'
import { questionTypeLabels } from '@/features/quizzes/hooks/useQuizEditorState'
import { cn } from '@/utils/cn'

interface QuestionListProps {
  questions: QuizBlockData['questions']
  isPublished: boolean
  onAddQuestion: () => void
  onUpdateQuestion: (idx: number, text: string) => void
  onRemoveQuestion: (idx: number) => void
  onAddOption: (qIdx: number) => void
  onUpdateOption: (qIdx: number, oIdx: number, text: string) => void
  onRemoveOption: (qIdx: number, oIdx: number) => void
  onSetCorrectOption: (qIdx: number, oIdx: number) => void
  onUpdateQuestionType: (qIdx: number, newType: QuestionType) => void
  onUpdateQuestionPoints: (qIdx: number, pts: number) => void
  onOpenQuestionModal: () => void
}

export function QuestionList({
  questions,
  isPublished,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onSetCorrectOption,
  onUpdateQuestionType,
  onUpdateQuestionPoints,
  onOpenQuestionModal,
}: QuestionListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 dark:text-white text-sm">
          Daftar Pertanyaan
          <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
            ({questions.length} soal)
          </span>
        </h4>
        {!isPublished && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQuestionModal}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Ambil dari Bank Soal
            </button>
            <button
              onClick={onAddQuestion}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Buat Baru
            </button>
          </div>
        )}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="w-8 h-8" />}
          title="Belum ada soal"
          description='Klik "Buat Baru" untuk mulai menyusun pertanyaan kuis.'
          className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] bg-white/50 dark:bg-slate-800/30"
        />
      ) : (
        questions.map((q, qIdx) => (
          <div
            key={q.id || qIdx}
            className="p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-[28px] bg-white dark:bg-slate-800 shadow-sm space-y-4 group relative hover:border-indigo-200 dark:hover:border-indigo-700/50 transition-all"
          >
            {/* Question type + number + delete */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center shrink-0 shadow-inner">
                {qIdx + 1}
              </span>
              <select
                value={q.question_type || 'MCQ'}
                onChange={(e) => onUpdateQuestionType(qIdx, e.target.value as QuestionType)}
                disabled={isPublished}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-medium disabled:opacity-60 transition-all dark:text-slate-100"
              >
                {Object.entries(questionTypeLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={q.points ?? 1}
                  onChange={(e) => onUpdateQuestionPoints(qIdx, parseInt(e.target.value) || 1)}
                  disabled={isPublished}
                  className="w-10 bg-transparent text-xs font-black text-slate-700 dark:text-slate-100 outline-none disabled:opacity-60"
                />
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  PTS
                </span>
              </div>
              <input
                type="text"
                value={q.text}
                onChange={(e) => onUpdateQuestion(qIdx, e.target.value)}
                disabled={isPublished}
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-[14px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 outline-none font-bold text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-500 disabled:opacity-60 transition-all"
                placeholder="Tulis pertanyaan di sini..."
              />
              {!isPublished && (
                <button
                  onClick={() => onRemoveQuestion(qIdx)}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Options -- hide for SHORT_ANSWER / ESSAY */}
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
                      onClick={() => !isPublished && onSetCorrectOption(qIdx, oIdx)}
                      disabled={isPublished}
                      title={opt.is_correct ? 'Jawaban benar' : 'Jadikan jawaban benar'}
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
                      onChange={(e) => onUpdateOption(qIdx, oIdx, e.target.value)}
                      disabled={isPublished || q.question_type === 'TRUE_FALSE'}
                      className={cn(
                        'flex-1 px-4 py-2 text-sm border rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-medium',
                        opt.is_correct
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 focus:ring-emerald-50'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300',
                        (isPublished || q.question_type === 'TRUE_FALSE') &&
                          'opacity-60 cursor-not-allowed'
                      )}
                      placeholder="Teks opsi..."
                    />
                    {!isPublished && q.options.length > 2 && q.question_type !== 'TRUE_FALSE' && (
                      <button
                        onClick={() => onRemoveOption(qIdx, oIdx)}
                        className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {!isPublished && q.question_type !== 'TRUE_FALSE' && (
                  <button
                    onClick={() => onAddOption(qIdx)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mt-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Tambah Opsi
                  </button>
                )}
              </div>
            )}

            {/* Text hint for essay/short-answer types */}
            {(q.question_type === 'SHORT_ANSWER' || q.question_type === 'ESSAY') && (
              <div className="pl-8">
                <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-600">
                  {q.question_type === 'SHORT_ANSWER'
                    ? 'Siswa akan mengetik jawaban singkat (dinilai manual oleh guru)'
                    : 'Siswa akan menulis esai panjang (dinilai manual oleh guru)'}
                </p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
