import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Book, CheckCircle, FileText, FolderOpen, Import, Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Modal, ModalHeader } from '@/components/ui/Modal'
import { useDebounce } from '@/hooks/useDebounce'
import { logDevError } from '@/utils/logDevError'

import { useImportTemplate, useTemplates } from '../queries/useTemplates'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'course' | 'module' | 'lesson'
  targetId: string // The ID where this template will be imported (courseId for course/module, moduleId for lesson)
  order?: number
}

export function TemplateModal({ isOpen, onClose, type, targetId, order }: TemplateModalProps) {
  const { data: templates, isLoading } = useTemplates(type)
  const importTemplateMutation = useImportTemplate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ⚡ Perf: Debounce search input to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Reset state when modal closes
  const prevOpenRef = useRef(isOpen)
  useEffect(() => {
    if (prevOpenRef.current && !isOpen) {
      setSearchQuery('')
      setSelectedId(null)
    }
    prevOpenRef.current = isOpen
  }, [isOpen])

  const handleImport = async () => {
    if (!selectedId) return

    try {
      await importTemplateMutation.mutateAsync({
        templateId: selectedId,
        targetId,
        order,
        // For course/module templates, targetId IS the courseId — pass it for narrow cache invalidation
        courseId: type !== 'lesson' ? targetId : undefined,
      })
      onClose()
    } catch (error) {
      logDevError('TemplateModal', 'Failed to import template', error)
    }
  }

  const typeLabels = {
    course: 'Kursus',
    module: 'Modul',
    lesson: 'Pelajaran',
  }

  const typeIcons = {
    course: <Book className="w-5 h-5" />,
    module: <FolderOpen className="w-5 h-5" />,
    lesson: <FileText className="w-5 h-5" />,
  }

  // ⚡ Perf: Memoize filteredTemplates — was recomputed on every render without useMemo
  const filteredTemplates = useMemo(
    () =>
      templates?.filter(
        (t) =>
          t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (t.description && t.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
      ) || [],
    [templates, debouncedSearch]
  )

  return (
    <Modal open={isOpen} onClose={onClose} size="lg">
      <ModalHeader title={`Gunakan Template ${typeLabels[type]}`} onClose={onClose} />

      <div className="flex flex-col h-[60vh] max-h-[600px]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau deskripsi template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-sm">Memuat template...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                {typeIcons[type]}
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                Tidak ada template ditemukan
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain.'
                  : `Anda belum memiliki template ${typeLabels[type].toLowerCase()}. Simpan ${typeLabels[type].toLowerCase()} yang sudah ada sebagai template.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedId(template.id)
                    }
                  }}
                  onClick={() => setSelectedId(template.id)}
                  className={`
                    relative p-4 rounded-xl border transition-all cursor-pointer text-left
                    ${
                      selectedId === template.id
                        ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 shadow-sm shadow-indigo-100 dark:shadow-none ring-1 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex gap-3">
                    <div
                      className={`
                      shrink-0 p-2 rounded-lg 
                      ${
                        selectedId === template.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }
                    `}
                    >
                      {typeIcons[type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`font-bold text-sm truncate pr-6 ${selectedId === template.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-800 dark:text-slate-200'}`}
                      >
                        {template.title}
                      </h4>
                      <p
                        className={`text-xs mt-0.5 line-clamp-2 ${selectedId === template.id ? 'text-indigo-700/70 dark:text-indigo-300/70' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        {template.description || 'Tidak ada deskripsi'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">
                        Dibuat pada{' '}
                        {format(new Date(template.created_at), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                  </div>
                  {selectedId === template.id && (
                    <div className="absolute top-4 right-4 text-indigo-600 dark:text-indigo-400">
                      <CheckCircle className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error feedback */}
        {importTemplateMutation.isError && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800/30 text-sm text-red-600 dark:text-red-400">
            Gagal mengimpor template. Silakan coba lagi.
          </div>
        )}

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedId || importTemplateMutation.isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
          >
            {importTemplateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Import className="w-4 h-4" />
            )}
            Gunakan Template
          </button>
        </div>
      </div>
    </Modal>
  )
}
