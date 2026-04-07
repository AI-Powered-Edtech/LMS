import { useCallback, useEffect, useRef, useState } from 'react'

import { type QuestionBankItem, questionBankService } from '../api/questionBankService'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type QuestionTypeFilter =
  | ''
  | 'MCQ'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'ESSAY'
  | 'MULTIPLE_SELECT'
export type DifficultyFilter = '' | '1' | '2' | '3' | '4' | '5'

export interface UseQuestionBankSelectOptions {
  /** ID kuis yang sedang diedit — digunakan untuk duplicate check */
  quizId?: string
  /** Dipanggil saat user menekan "Impor" */
  onSelect: (questions: QuestionBankItem[]) => void
  /** ID soal yang sudah ada di kuis (untuk mencegah duplikasi) */
  existingQuestionIds?: string[]
}

export interface UseQuestionBankSelectReturn {
  // Data
  questions: QuestionBankItem[]
  isLoading: boolean
  error: string | null

  // Filter & Search
  searchQuery: string
  filterType: QuestionTypeFilter
  filterDifficulty: DifficultyFilter
  filterTags: string[]
  setSearchQuery: (q: string) => void
  setFilterType: (t: QuestionTypeFilter) => void
  setFilterDifficulty: (d: DifficultyFilter) => void
  setFilterTags: (tags: string[]) => void

  // Selection
  selectedIds: Set<string>
  selectedCount: number
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  isSelected: (id: string) => boolean

  // Actions
  importSelected: () => void
  isImporting: boolean
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useQuestionBankSelect({
  onSelect,
  existingQuestionIds = [],
}: UseQuestionBankSelectOptions): UseQuestionBankSelectReturn {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<QuestionTypeFilter>('')
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyFilter>('')
  const [filterTags, setFilterTags] = useState<string[]>([])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isImporting, setIsImporting] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch questions ────────────────────────────────────

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await questionBankService.searchQuestions({
        query: searchQuery || undefined,
        questionType: filterType || undefined,
        difficulty: filterDifficulty ? parseInt(filterDifficulty) : undefined,
        tags: filterTags.length > 0 ? filterTags : undefined,
        limit: 100,
      })
      setQuestions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat soal dari bank.')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, filterType, filterDifficulty, filterTags])

  // Fetch saat filter berubah (non-search: langsung)
  useEffect(() => {
    fetchQuestions()
  }, [filterType, filterDifficulty, filterTags, fetchQuestions])

  // Fetch saat search berubah (debounce 400ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchQuestions()
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // ── Selection helpers ──────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    // Hanya soal yang belum ada di kuis
    const available = questions.filter((q) => !existingQuestionIds.includes(q.id))
    setSelectedIds(new Set(available.map((q) => q.id)))
  }, [questions, existingQuestionIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  // ── Import ─────────────────────────────────────────────

  const importSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    setIsImporting(true)
    const selected = questions.filter((q) => selectedIds.has(q.id))
    onSelect(selected)
    setIsImporting(false)
    clearSelection()
  }, [selectedIds, questions, onSelect, clearSelection])

  return {
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

    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,

    importSelected,
    isImporting,
  }
}
