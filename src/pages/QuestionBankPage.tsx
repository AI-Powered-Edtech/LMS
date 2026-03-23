import { useVirtualizer } from '@tanstack/react-virtual'
import { BookOpen, Filter, Loader2, Plus, Search } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { useToast } from '@/src/components/ui'
import {
  QuestionBankItem,
  questionBankService,
} from '@/src/features/question-bank/api/questionBankService'
import { QuestionBankSkeleton } from '@/src/features/question-bank/components/QuestionBankSkeleton'
import { QuestionCard } from '@/src/features/question-bank/components/QuestionCard'
import { QuestionEditor } from '@/src/features/question-bank/components/QuestionEditor'
import { usePageTitle } from '@/src/hooks/usePageTitle'

export function QuestionBankPage() {
  const addToast = useToast((s) => s.addToast)
  usePageTitle('Bank Soal')
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Editor modal state
  const [showEditor, setShowEditor] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | undefined>(undefined)

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  })

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    loadQuestions()
  }, [debouncedSearchTerm, typeFilter])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await questionBankService.searchQuestions({
        query: debouncedSearchTerm || undefined,
        questionType: typeFilter || undefined,
        limit: 50,
      })
      setQuestions(data)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (id: string) => {
    setEditingQuestionId(id)
    setShowEditor(true)
  }

  const handleCreateNew = () => {
    setEditingQuestionId(undefined)
    setShowEditor(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return

    try {
      await questionBankService.archiveQuestion(id)
      setQuestions((q) => q.filter((item) => item.id !== id))
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete question:', error)
      addToast({ type: 'error', message: 'Gagal menghapus soal.' })
    }
  }

  if (loading && questions.length === 0) {
    return <QuestionBankSkeleton />
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Bank Soal
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Kelola koleksi soal untuk kuis dan ujian.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex justify-center items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Soal Baru</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari soal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-4">
            <div className="w-48 relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              >
                <option value="">Semua Tipe</option>
                <option value="MCQ">Pilihan Ganda</option>
                <option value="TRUE_FALSE">Benar/Salah</option>
                <option value="SHORT_ANSWER">Isian Singkat</option>
                <option value="ESSAY">Esai</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500">Memuat soal...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center px-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
            Tidak ada soal ditemukan
          </h3>
          <p className="text-slate-500 max-w-sm">
            Coba gunakan kata kunci berbeda atau buat soal baru.
          </p>
        </div>
      ) : (
        <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const q = questions[vRow.index]
              return (
                <div
                  key={q.id}
                  ref={virtualizer.measureElement}
                  data-index={vRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    <QuestionCard question={q} onEdit={handleEdit} onDelete={handleDelete} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <QuestionEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        questionId={editingQuestionId}
        onSaveSuccess={loadQuestions}
      />
    </div>
  )
}
