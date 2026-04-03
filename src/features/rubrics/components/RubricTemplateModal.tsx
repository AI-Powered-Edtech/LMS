import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, ClipboardList, Loader2, Search, X } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

import { useRubricById, useRubricTemplates } from '../queries/rubricQueries'
import type { Rubric } from '../types'

interface RubricTemplateModalProps {
  onSelect: (rubric: Rubric) => void
  onClose: () => void
}

function TemplateSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse space-y-2"
        >
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

// Inner component to fetch and return a full rubric after selection
function TemplateLoader({
  rubricId,
  onLoaded,
}: {
  rubricId: string
  onLoaded: (rubric: Rubric) => void
}) {
  const { data, isLoading } = useRubricById(rubricId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (data) {
    onLoaded(data)
  }

  return null
}

export function RubricTemplateModal({ onSelect, onClose }: RubricTemplateModalProps) {
  const { tenantId } = useAuth()
  const { data: templates, isLoading } = useRubricTemplates(tenantId)
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = (templates ?? []).filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (id: string) => {
    setLoadingId(id)
  }

  const handleLoaded = (rubric: Rubric) => {
    setLoadingId(null)
    onSelect(rubric)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Template Rubrik</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih template untuk diimpor
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari template..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {isLoading && <TemplateSkeleton />}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-10">
                <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                  {search ? 'Template tidak ditemukan' : 'Belum ada template tersimpan'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {search
                    ? 'Coba kata kunci lain'
                    : 'Buat rubrik dan aktifkan opsi "Simpan sebagai Template"'}
                </p>
              </div>
            )}

            {!isLoading &&
              filtered.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template.id)}
                  disabled={loadingId === template.id}
                  className={cn(
                    'w-full text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group',
                    loadingId === template.id && 'opacity-70 cursor-wait'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate group-hover:text-purple-700 dark:group-hover:text-purple-400">
                        {template.title}
                      </h3>
                      {template.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg shrink-0">
                      {template.total_points} poin
                    </span>
                  </div>
                  {loadingId === template.id && (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                      <span className="text-xs text-purple-600 dark:text-purple-400">
                        Memuat template...
                      </span>
                    </div>
                  )}
                </button>
              ))}

            {/* TemplateLoader is invisible — just triggers the fetch */}
            {loadingId && <TemplateLoader rubricId={loadingId} onLoaded={handleLoaded} />}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
