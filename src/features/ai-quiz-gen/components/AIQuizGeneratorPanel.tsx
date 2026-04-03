import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, CheckSquare, RotateCcw, Sparkles, Square, X } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/utils/cn'
import type { GeneratedQuestion } from '../types'
import { useAIQuizGen } from '../hooks/useAIQuizGen'

interface AIQuizGeneratorPanelProps {
  lessonId: string
  onInsertQuestions: (questions: GeneratedQuestion[]) => void
  onClose: () => void
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: 'Pilihan Ganda',
  TRUE_FALSE: 'Benar/Salah',
  MULTIPLE_SELECT: 'Pilih Beberapa',
  SHORT_ANSWER: 'Jawaban Singkat',
}

const QUESTION_TYPE_COLORS: Record<string, string> = {
  MCQ: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  TRUE_FALSE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MULTIPLE_SELECT: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  SHORT_ANSWER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER'

export function AIQuizGeneratorPanel({
  lessonId,
  onInsertQuestions,
  onClose,
}: AIQuizGeneratorPanelProps) {
  const { generate, isGenerating, result, error, reset } = useAIQuizGen()

  // Config state
  const [questionCount, setQuestionCount] = useState(5)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['MCQ'])
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  // Selection state for generated questions
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const toggleType = (type: QuestionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleGenerate = () => {
    if (selectedTypes.length === 0) return
    generate({
      lessonId,
      questionCount,
      questionTypes: selectedTypes,
      difficulty,
    })
    setSelectedIndices(new Set())
  }

  // When result arrives, select all by default
  const handleResultArrived = () => {
    if (result) {
      setSelectedIndices(new Set(result.questions.map((_, i) => i)))
    }
  }

  // Toggle individual question selection
  const toggleQuestion = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    if (!result) return
    if (selectedIndices.size === result.questions.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(result.questions.map((_, i) => i)))
    }
  }

  const handleInsert = () => {
    if (!result) return
    const chosen = result.questions.filter((_, i) => selectedIndices.has(i))
    if (chosen.length === 0) return
    onInsertQuestions(chosen)
  }

  // When result changes, auto-select all
  if (result && selectedIndices.size === 0 && result.questions.length > 0) {
    handleResultArrived()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed right-0 top-0 h-full w-full max-w-lg z-50',
        'bg-white dark:bg-slate-900',
        'border-l border-slate-200 dark:border-slate-700',
        'shadow-2xl flex flex-col overflow-hidden'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Generator Soal AI"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 shrink-0">
        <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
          <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-black text-slate-800 dark:text-slate-100 text-base">
            Buat Soal dari Materi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            AI akan membuat soal kuis berdasarkan konten materi ini
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="Tutup panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Config section */}
        <div className="space-y-4">
          {/* Question count */}
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Jumlah Soal
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="flex-1 accent-violet-600"
                disabled={isGenerating}
              />
              <span className="w-10 text-center font-black text-lg text-violet-600 dark:text-violet-400">
                {questionCount}
              </span>
            </div>
          </div>

          {/* Question types */}
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Tipe Soal
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  disabled={isGenerating}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                    selectedTypes.includes(type)
                      ? 'bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:border-violet-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {QUESTION_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                Pilih minimal satu tipe soal.
              </p>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Tingkat Kesulitan
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: 'easy', label: 'Mudah', color: 'emerald' },
                  { value: 'medium', label: 'Sedang', color: 'amber' },
                  { value: 'hard', label: 'Sulit', color: 'rose' },
                ] as const
              ).map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  disabled={isGenerating}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-black transition-all border',
                    difficulty === value
                      ? color === 'emerald'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : color === 'amber'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-rose-500 text-white border-rose-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || selectedTypes.length === 0}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all',
            'bg-gradient-to-r from-violet-600 to-indigo-600 text-white',
            'hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-200 dark:shadow-violet-900/30',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2'
          )}
        >
          {isGenerating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sedang membuat soal...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              🤖 Buat Soal Otomatis
            </>
          )}
        </button>

        {/* Loading message */}
        <AnimatePresence>
          {isGenerating && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-center text-slate-500 dark:text-slate-400"
            >
              Sedang membuat soal... (bisa memakan waktu 10–30 detik)
            </motion.p>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl"
            >
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  Gagal membuat soal
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
              </div>
              <button
                onClick={reset}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors text-red-500"
                aria-label="Coba lagi"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result preview */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {result.questions.length} soal dibuat untuk "{result.lesson_title}"
                </h3>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-bold"
                >
                  {selectedIndices.size === result.questions.length ? 'Batal semua' : 'Pilih semua'}
                </button>
              </div>

              <div className="space-y-2">
                {result.questions.map((q, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => toggleQuestion(idx)}
                    className={cn(
                      'p-3.5 rounded-xl border cursor-pointer transition-all select-none',
                      selectedIndices.has(idx)
                        ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0 text-violet-500 dark:text-violet-400">
                        {selectedIndices.has(idx) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={cn(
                              'text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full',
                              QUESTION_TYPE_COLORS[q.question_type] ||
                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            )}
                          >
                            {QUESTION_TYPE_LABELS[q.question_type] || q.question_type}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                            {q.points} poin
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">
                          {q.text}
                        </p>
                        {q.options && q.options.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {q.options.map((opt, oi) => (
                              <li
                                key={oi}
                                className={cn(
                                  'text-xs pl-2',
                                  opt.is_correct
                                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                    : 'text-slate-500 dark:text-slate-400'
                                )}
                              >
                                {opt.is_correct ? '✓ ' : '○ '}
                                {opt.text}
                              </li>
                            ))}
                          </ul>
                        )}
                        {q.explanation && (
                          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 italic">
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer — Insert button */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={handleInsert}
              disabled={selectedIndices.size === 0}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all',
                'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
              )}
            >
              Gunakan {selectedIndices.size > 0 ? `${selectedIndices.size} ` : ''}Soal Terpilih
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
