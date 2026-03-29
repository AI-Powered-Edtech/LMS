import { Book, CheckCircle, FileText, FolderOpen, Loader2, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Modal, ModalHeader } from '@/src/components/ui/Modal'

import { useSaveTemplate } from '../queries/useTemplates'

interface SaveTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'course' | 'module' | 'lesson'
  sourceId: string
  defaultTitle?: string
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  type,
  sourceId,
  defaultTitle,
}: SaveTemplateModalProps) {
  const saveTemplateMutation = useSaveTemplate()
  const [title, setTitle] = useState(defaultTitle ? `${defaultTitle} (Template)` : '')
  const [description, setDescription] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Reset state when modal closes
  const prevOpenRef = useRef(isOpen)
  useEffect(() => {
    if (prevOpenRef.current && !isOpen) {
      setTitle('')
      setDescription('')
      setSuccess(false)
      setError('')
    }
    prevOpenRef.current = isOpen
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setError('')

    try {
      await saveTemplateMutation.mutateAsync({
        type,
        title,
        description,
        sourceId,
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setTitle('')
        setDescription('')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan template. Silakan coba lagi.')
    }
  }

  const typeLabels = {
    course: 'Kursus',
    module: 'Modul',
    lesson: 'Pelajaran',
  }

  const typeIcons = {
    course: <Book className="w-5 h-5 text-blue-500" />,
    module: <FolderOpen className="w-5 h-5 text-indigo-500" />,
    lesson: <FileText className="w-5 h-5 text-emerald-500" />,
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <ModalHeader title={`Simpan sebagai Template ${typeLabels[type]}`} onClose={onClose} />
      <div className="p-6">
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 animate-in zoom-in" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              Template Tersimpan!
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Template ini sekarang dapat digunakan di kursus lain.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                {typeIcons[type]}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {typeLabels[type]} akan disimpan sebagai template yang dapat digunakan ulang.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Template <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Contoh: Template ${typeLabels[type]} Standar`}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Deskripsi Singkat <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kegunaan template ini..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={saveTemplateMutation.isPending}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!title.trim() || saveTemplateMutation.isPending}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {saveTemplateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan Template
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
