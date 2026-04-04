import { BookOpen, Clock, FileText, RotateCcw, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { useToast } from '@/components/ui'
import { cn } from '@/utils/cn'

import { useAIContentHistory, useDeleteGeneration } from '../queries/creatorQueries'
import type { AIGeneratedContent, GenerateAIContentResponse } from '../types'

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
  onLoad: (content: GenerateAIContentResponse) => void
}

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Kuis (PG)',
  reading: 'Membaca',
  writing: 'Menulis',
}

const TYPE_COLORS: Record<string, string> = {
  quiz: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  reading: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  writing: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryPanel({ open, onClose, onLoad }: HistoryPanelProps) {
  const addToast = useToast((s) => s.addToast)
  const { data: history = [], isLoading } = useAIContentHistory()
  const deleteGeneration = useDeleteGeneration()

  const handleLoad = (item: AIGeneratedContent) => {
    onLoad({
      id: item.id,
      type: item.assignment_type,
      tenant_id: item.tenant_id,
      summary: item.summary ?? '',
      questions: item.questions,
    })
    onClose()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteGeneration.mutateAsync(id, {
      onSuccess: () => addToast({ type: 'success', message: 'Riwayat dihapus.' }),
      onError: () => addToast({ type: 'error', message: 'Gagal menghapus riwayat.' }),
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h2 className="font-bold text-slate-900 dark:text-slate-100">
                  Riwayat Generasi AI
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Belum ada riwayat
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Hasil generasi AI akan tersimpan di sini
                  </p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer group"
                    onClick={() => handleLoad(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoad(item)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate"
                          title={item.file_name}
                        >
                          {item.file_name}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-full',
                              TYPE_COLORS[item.assignment_type] ?? TYPE_COLORS.quiz
                            )}
                          >
                            {TYPE_LABELS[item.assignment_type] ?? item.assignment_type}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
                            {item.bloom_level}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
                            {item.question_count} soal
                          </span>
                          {item.used_at && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                              ✓ Digunakan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <div
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Muat kembali"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, e)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Hapus riwayat"
                          aria-label="Hapus riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
