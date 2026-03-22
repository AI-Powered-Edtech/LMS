import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Loader2, Plus, Filter, X } from 'lucide-react'
import {
  questionBankService,
  QuestionBankItem,
} from '@/src/features/question-bank/api/questionBankService'
import { QuestionCard } from './QuestionCard'
import { useToast } from '@/src/hooks/useToast'

interface QuestionSearchModalProps {
  quizId: string
  isOpen: boolean
  onClose: () => void
  onAddSuccess?: (question: QuestionBankItem) => void
}

export const QuestionSearchModal: React.FC<QuestionSearchModalProps> = ({
  quizId,
  isOpen,
  onClose,
  onAddSuccess,
}) => {
  const { addToast } = useToast()
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState('')

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isOpen) {
      loadQuestions()
    }
  }, [isOpen, typeFilter])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      loadQuestions()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await questionBankService.searchQuestions({
        query: searchQuery || undefined,
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

  const handleAddQuestion = async (question: QuestionBankItem) => {
    if (!quizId) {
      addToast({
        type: 'error',
        message: 'Harap simpan kuis terlebih dahulu sebelum menambahkan soal dari bank.',
      })
      return
    }

    setAddingIds((prev) => new Set(prev).add(question.id))
    try {
      await questionBankService.addQuestionToQuiz(question.id, quizId, 1, 0) // Need proper order index logic in backend
      if (onAddSuccess) {
        onAddSuccess(question)
      }
      // Optionally remove from list or show visual feedback
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to add question:', error)
      addToast({ type: 'error', message: 'Gagal menambahkan soal ke kuis.' })
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev)
        next.delete(question.id)
        return next
      })
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Cari dari Bank Soal
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Pilih soal untuk ditambahkan ke kuis ini.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan teks soal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="w-48 relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm"
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

          {/* List */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 dark:bg-slate-900/20">
            {loading && questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <span className="text-sm">Mencari soal...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mx-10">
                <Search className="w-10 h-10 mb-3 text-slate-300" />
                <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300">
                  Tidak ada hasil
                </h3>
                <p className="text-sm mt-1">Coba gunakan kata kunci lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {questions.map((q) => (
                  <div key={q.id} className="relative group">
                    <QuestionCard question={q} />

                    {/* Overlay for Add action */}
                    <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleAddQuestion(q)}
                        disabled={addingIds.has(q.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-75"
                      >
                        {addingIds.has(q.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        {addingIds.has(q.id) ? 'Menambahkan...' : 'Tambah ke Kuis'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
