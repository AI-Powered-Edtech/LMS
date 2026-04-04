/**
 * HistoryPanel Component
 * Slide-over panel showing previous AI generation history.
 */

import { BookOpen, Clock, FileText, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { cn } from '@/utils/cn'

import type { AssignmentType, CreatorHistoryItem, GeneratedQuestion } from '../types'
import { useCreatorHistory } from '../queries/creatorQueries'

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
  onLoad: (content: {
    id: string | null
    type: AssignmentType
    summary: string
    questions: GeneratedQuestion[]
  }) => void
}

const TYPE_LABEL: Record<string, string> = {
  quiz: 'Kuis (PG)',
  reading: 'Membaca',
  writing: 'Menulis',
}

export function HistoryPanel({ open, onClose, onLoad }: HistoryPanelProps) {
  const { data: history, isLoading } = useCreatorHistory()

  const handleLoad = (item: CreatorHistoryItem) => {
    onLoad({
      id: item.id,
      type: item.type as AssignmentType,
      summary: item.summary,
      questions: item.questions,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="history-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Riwayat Generasi
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!isLoading && (!history || history.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-medium text-slate-600 dark:text-slate-300">
                    Belum ada riwayat
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Generasi pertamamu akan muncul di sini.
                  </p>
                </div>
              )}

              {!isLoading &&
                history?.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-4"
                  >
                    {/* Meta */}
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                            {TYPE_LABEL[item.type] ?? item.type}
                          </span>
                          {item.is_used && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                              Digunakan
                            </span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {item.questions.length} soal
                          </span>
                        </div>
                        {item.file_name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                            {item.file_name}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Summary preview */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {item.summary || (
                        <span className="text-slate-400 italic">Tidak ada rangkuman.</span>
                      )}
                    </p>

                    {/* Load button */}
                    <button
                      type="button"
                      onClick={() => handleLoad(item)}
                      className={cn(
                        'mt-3 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
                        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600',
                        'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700',
                        'text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300'
                      )}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Muat Konten Ini
                    </button>
                  </div>
                ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
