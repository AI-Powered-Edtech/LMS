import { BarChart3, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

import { QuestionSearchModal } from '@/features/question-bank/components/QuestionSearchModal'
import type { QuestionType, QuizMode } from '@/features/quizzes'
import { QuizAnalyticsPanel } from '@/features/quizzes/components/analytics'
import { QuestionList } from '@/features/quizzes/components/QuestionList'
import { QuizEditorToolbar } from '@/features/quizzes/components/QuizEditorToolbar'
import { useQuizEditorState } from '@/features/quizzes/hooks/useQuizEditorState'

export function QuizBlockEditor({ blockId: _blockId }: { blockId: string }) {
  const s = useQuizEditorState(_blockId)

  if (s.isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Memuat data kuis...</span>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <QuizEditorToolbar
        isPublished={s.isPublished}
        isSaving={s.isSaving}
        isPublishing={s.isPublishing}
        error={s.error}
        onSave={() => s.handleSave()}
        onPublishToggle={s.handlePublishToggle}
      />

      {/* Quiz Settings */}
      <div className="grid grid-cols-1 gap-6 p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[32px] border border-slate-200/50 dark:border-slate-700/50">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Judul Kuis
          </label>
          <input
            type="text"
            value={s.quizData.title}
            onChange={(e) => s.setQuizData({ ...s.quizData, title: e.target.value })}
            disabled={s.isPublished}
            className="w-full px-5 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all disabled:opacity-60 font-bold text-slate-700 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-500 shadow-sm"
            placeholder="Masukkan judul kuis..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Instruksi Pengerjaan
          </label>
          <textarea
            value={s.quizData.instructions || ''}
            onChange={(e) => s.setQuizData({ ...s.quizData, instructions: e.target.value })}
            disabled={s.isPublished}
            rows={2}
            className="w-full px-5 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all resize-none disabled:opacity-60 font-medium text-slate-600 dark:text-slate-300 placeholder:text-slate-200 dark:placeholder:text-slate-500 shadow-sm"
            placeholder="Tuliskan panduan singkat untuk kuis ini..."
          />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
              Maks. Percobaan
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={s.quizData.max_attempts}
              onChange={(e) =>
                s.setQuizData({ ...s.quizData, max_attempts: parseInt(e.target.value) })
              }
              disabled={s.isPublished}
              className="w-full px-5 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all disabled:opacity-60 font-black text-slate-700 dark:text-slate-100 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
              Lulus Min. (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={s.quizData.passing_score}
              onChange={(e) =>
                s.setQuizData({ ...s.quizData, passing_score: parseInt(e.target.value) })
              }
              disabled={s.isPublished}
              className="w-full px-5 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all disabled:opacity-60 font-black text-slate-700 dark:text-slate-100 shadow-sm"
            />
          </div>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={s.quizData.shuffle_questions}
                onChange={(e) =>
                  s.setQuizData({ ...s.quizData, shuffle_questions: e.target.checked })
                }
                disabled={s.isPublished}
                className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Acak Pertanyaan
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={s.quizData.shuffle_options}
                onChange={(e) =>
                  s.setQuizData({ ...s.quizData, shuffle_options: e.target.checked })
                }
                disabled={s.isPublished}
                className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Acak Opsi Pilihan
              </span>
            </label>
          </div>
        </div>

        {/* Quiz Mode & Availability */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Mode Kuis
            </label>
            <select
              value={s.quizData.mode || 'graded'}
              onChange={(e) => s.setQuizData({ ...s.quizData, mode: e.target.value as QuizMode })}
              disabled={s.isPublished}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 text-sm dark:text-slate-100"
            >
              <option value="practice">Latihan (unlimited)</option>
              <option value="graded">Dinilai (max attempt)</option>
              <option value="exam">Ujian (1 attempt)</option>
            </select>
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={s.quizData.show_correct_answers ?? false}
                onChange={(e) =>
                  s.setQuizData({ ...s.quizData, show_correct_answers: e.target.checked })
                }
                disabled={s.isPublished}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Tampilkan jawaban benar
              </span>
            </label>
          </div>
        </div>
      </div>

      <QuestionList
        questions={s.quizData.questions}
        isPublished={s.isPublished}
        onAddQuestion={s.addQuestion}
        onUpdateQuestion={s.updateQuestion}
        onRemoveQuestion={s.removeQuestion}
        onAddOption={s.addOption}
        onUpdateOption={s.updateOption}
        onRemoveOption={s.removeOption}
        onSetCorrectOption={s.setCorrectOption}
        onUpdateQuestionType={s.updateQuestionType}
        onUpdateQuestionPoints={s.updateQuestionPoints}
        onOpenQuestionModal={() => s.setShowQuestionModal(true)}
      />

      {s.isPublished && (
        <p className="text-xs text-center text-slate-400 pb-2">
          Kuis sudah dipublish. Kembalikan ke Draft untuk mengedit soal.
        </p>
      )}

      {s.savedQuizId && (
        <QuestionSearchModal
          quizId={s.savedQuizId}
          isOpen={s.showQuestionModal}
          onClose={() => s.setShowQuestionModal(false)}
          onAddSuccess={(question) => {
            s.setQuizData((prev) => ({
              ...prev,
              questions: [
                ...prev.questions,
                {
                  id: question.id,
                  text: question.question_text,
                  order: prev.questions.length + 1,
                  question_type: question.question_type as QuestionType,
                  points: 1,
                  explanation: question.explanation || '',
                  options: (question.options || []).map((o) => ({
                    text: o.option_text,
                    is_correct: o.is_correct,
                  })),
                },
              ],
            }))
            s.setShowQuestionModal(false)
          }}
        />
      )}

      {s.savedQuizId && s.isPublished && (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <button
            onClick={() => s.setShowAnalytics(!s.showAnalytics)}
            className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Analitik Kuis
            {s.showAnalytics ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {s.showAnalytics && (
            <div className="mt-4">
              <QuizAnalyticsPanel quizId={s.savedQuizId} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
