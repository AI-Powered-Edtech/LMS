import { BookOpen, CheckSquare, Filter, Loader2, Search, Square, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React from 'react'

import { Skeleton } from '@/components/ui/Skeleton'
import { type QuestionBankItem } from '@/features/question-bank/api/questionBankService'
import {
  type DifficultyFilter,
  type QuestionTypeFilter,
  useQuestionBankSelect,
} from '@/features/question-bank/hooks/useQuestionBankSelect'
import { cn } from '@/utils/cn'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface ImportFromQuestionBankProps {
  isOpen: boolean
  onClose: () => void
  onImport: (questions: QuestionBankItem[]) => Promise<void>
  existingQuestionIds?: string[]
  isImporting?: boolean
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const questionTypeLabels: Record<string, string> = {
  MCQ: 'Pilihan Ganda',
  TRUE_FALSE: 'Benar/Salah',
  MULTIPLE_SELECT: 'Pilih Beberapa',
  SHORT_ANSWER: 'Isian Singkat',
  ESSAY: 'Esai',
}

const questionTypeBadgeColor: Record<string, string> = {
  MCQ: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  TRUE_FALSE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MULTIPLE_SELECT: 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  SHORT_ANSWER: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ESSAY: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
}

const difficultyLabels: Record<string, string> = {
  '1': 'Sangat Mudah',
  '2': 'Mudah',
  '3': 'Sedang',
  '4': 'Sulit',
  '5': 'Sangat Sulit',
}

const difficultyBadgeColor: Record<string, string> = {
  '1': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  '2': 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  '3': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  '4': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  '5': 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
}

// ─────────────────────────────────────────────────────────
// Skeleton loading row
// ─────────────────────────────────────────────────────────

function QuestionRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl animate-pulse">
      <Skeleton className="w-5 h-5 rounded shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export const ImportFromQuestionBank: React.FC<ImportFromQuestionBankProps> = ({
  isOpen,
  onClose,
  onImport,
  existingQuestionIds = [],
  isImporting: isImportingProp = false,
}) => {
  const {
    questions,
    isLoading,
    error,
    searchQuery,
    filterType,
    filterDifficulty,
    filterTags,
    setSearchQuery,
    setFilterType,
    setFilterDifficulty,
    setFilterTags,
    selectedCount,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    importSelected,
    isImporting: hookImporting,
  } = useQuestionBankSelect({
    onSelect: onImport,
    existingQuestionIds,
  })

  const isDoingImport = isImportingProp || hookImporting

  const handleImport = () => {
    importSelected()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-700"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                <BookOpen className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                  Impor dari Bank Soal
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Pilih soal untuk ditambahkan ke kuis ini
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Toolbar ── */}
          <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 shrink-0 space-y-3">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari soal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm dark:text-neutral-100 placeholder:text-neutral-400"
                />
              </div>

              {/* Filter Type */}
              <div className="w-44 relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as QuestionTypeFilter)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm dark:text-neutral-100 appearance-none"
                >
                  <option value="">Semua Tipe</option>
                  <option value="MCQ">Pilihan Ganda</option>
                  <option value="TRUE_FALSE">Benar/Salah</option>
                  <option value="MULTIPLE_SELECT">Pilih Beberapa</option>
                  <option value="SHORT_ANSWER">Isian Singkat</option>
                  <option value="ESSAY">Esai</option>
                </select>
              </div>

              {/* Filter Difficulty */}
              <div className="w-36 relative">
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value as DifficultyFilter)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm dark:text-neutral-100 appearance-none"
                >
                  <option value="">Semua Tingkat</option>
                  <option value="1">Sangat Mudah</option>
                  <option value="2">Mudah</option>
                  <option value="3">Sedang</option>
                  <option value="4">Sulit</option>
                  <option value="5">Sangat Sulit</option>
                </select>
              </div>

              {/* Filter Tags */}
              <div className="flex-1 min-w-[150px]">
                <input
                  type="text"
                  placeholder="Filter Tag (koma...)"
                  value={filterTags.join(', ')}
                  onChange={(e) =>
                    setFilterTags(
                      e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm dark:text-neutral-100 placeholder:text-neutral-400"
                />
              </div>
            </div>

            {/* Selection bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                {questions.length > 0 && (
                  <>
                    <button
                      onClick={selectAll}
                      className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Pilih Semua
                    </button>
                    <span>·</span>
                    <button
                      onClick={clearSelection}
                      className="flex items-center gap-1 font-medium hover:underline transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Batalkan Pilihan
                    </button>
                  </>
                )}
              </div>
              {selectedCount > 0 && (
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-full">
                  {selectedCount} soal dipilih
                </span>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {error && (
              <div className="p-3 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400 text-sm rounded-xl">
                {error}
              </div>
            )}

            {isLoading && questions.length === 0 && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <QuestionRowSkeleton key={i} />
                ))}
              </div>
            )}

            {!isLoading && questions.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold text-neutral-500 dark:text-neutral-400 text-sm">
                  Bank soal kosong atau tidak ditemukan.
                </p>
              </div>
            )}

            {questions.length > 0 && (
              <div className="space-y-2">
                {questions.map((q) => {
                  const alreadyAdded = existingQuestionIds.includes(q.id)
                  const selected = isSelected(q.id)
                  const diffLevel = String(q.difficulty_level ?? 3)

                  return (
                    <div
                      key={q.id}
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => !alreadyAdded && toggleSelect(q.id)}
                      className={cn(
                        'flex items-start gap-3 p-4 border rounded-xl transition-all',
                        alreadyAdded
                          ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40'
                          : selected
                            ? 'cursor-pointer border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500'
                            : 'cursor-pointer border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      )}
                    >
                      <div className="shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={alreadyAdded}
                          onChange={() => {}}
                          className="w-4.5 h-4.5 rounded accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={cn(
                              'text-[11px] font-bold px-2 py-0.5 rounded-md',
                              questionTypeBadgeColor[q.question_type] ??
                                'bg-neutral-100 text-neutral-600'
                            )}
                          >
                            {questionTypeLabels[q.question_type] ?? q.question_type}
                          </span>

                          {q.difficulty_level && (
                            <span
                              className={cn(
                                'text-[11px] font-bold px-2 py-0.5 rounded-md',
                                difficultyBadgeColor[diffLevel] ?? 'bg-neutral-100 text-neutral-600'
                              )}
                            >
                              {difficultyLabels[diffLevel] ?? 'Sedang'}
                            </span>
                          )}

                          {alreadyAdded && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                              Sudah ditambahkan
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">
                          {q.question_text}
                        </p>

                        {q.tags && q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {questions.length} soal ditemukan
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0 || isDoingImport}
                className={cn(
                  'px-4 py-2 text-sm font-bold rounded-xl transition-colors flex items-center gap-2',
                  selectedCount > 0 && !isDoingImport
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                )}
              >
                {isDoingImport && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDoingImport ? 'Mengimpor…' : `Impor ${selectedCount} Soal`}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
