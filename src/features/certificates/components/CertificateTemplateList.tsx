import { CheckCircle, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, ModalBody, ModalHeader } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import {
  useCertificateTemplates,
  useDeleteCertificateTemplate,
  useSetDefaultTemplate,
} from '../queries/certificateTemplateQueries'
import type { CertificateTemplate } from '../types'
import { CertificateTemplateEditor } from './CertificateTemplateEditor'
import { CertificateTemplatePreview } from './CertificateTemplatePreview'

// ==========================================================================
// CertificateTemplateList
// Phase 36C — List, edit, and manage certificate templates.
// ==========================================================================

export interface CertificateTemplateListProps {
  courseId?: string
  tenantId: string
}

export function CertificateTemplateList({ courseId, tenantId }: CertificateTemplateListProps) {
  const { addToast } = useToast()
  const { data: templates, isLoading } = useCertificateTemplates(tenantId)
  const deleteMutation = useDeleteCertificateTemplate()
  const setDefaultMutation = useSetDefaultTemplate()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | undefined>()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingTemplate(undefined)
    setEditorOpen(true)
  }

  const openEdit = (t: CertificateTemplate) => {
    setEditingTemplate(t)
    setEditorOpen(true)
  }

  const handleSaved = () => {
    setEditorOpen(false)
    setEditingTemplate(undefined)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      addToast({ type: 'success', message: 'Template berhasil dihapus' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      addToast({ type: 'error', message: `Gagal menghapus template: ${msg}` })
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultMutation.mutateAsync(id)
      addToast({ type: 'success', message: 'Template dijadikan default' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      addToast({ type: 'error', message: `Gagal mengubah default: ${msg}` })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" className="text-blue-500" />
      </div>
    )
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Template Sertifikat</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Buat dan kelola desain sertifikat untuk kursus Anda
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold',
            'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
            'dark:bg-blue-500 dark:hover:bg-blue-600',
            'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
        >
          <Plus className="w-4 h-4" />
          Buat Template Baru
        </button>
      </div>

      {/* ── Grid ───────────────────────────────────────────────── */}
      {!templates || templates.length === 0 ? (
        <EmptyState
          icon={<Star className="h-10 w-10" />}
          title="Belum ada template"
          description="Buat template sertifikat untuk memberikan tampilan unik pada sertifikat kursus Anda."
          action={{ label: 'Buat Template Pertama', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {templates.map((tmpl) => (
              <motion.div
                key={tmpl.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  'group relative rounded-2xl border p-4 space-y-3',
                  'bg-white dark:bg-slate-900',
                  'border-slate-200 dark:border-slate-700/60',
                  'hover:shadow-md transition-shadow',
                  tmpl.is_default && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                )}
              >
                {/* Default badge */}
                {tmpl.is_default && (
                  <div className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <CheckCircle className="w-3 h-3" />
                    Default
                  </div>
                )}

                {/* Preview thumbnail */}
                <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-700/40 aspect-[4/3] relative">
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: 'scale(0.65)',
                      transformOrigin: 'top left',
                      width: '154%',
                      height: '154%',
                    }}
                  >
                    <CertificateTemplatePreview
                      template={tmpl}
                      studentName="Nama Siswa"
                      courseName="Nama Kursus"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Name */}
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {tmpl.name}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openEdit(tmpl)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                      'bg-slate-100 text-slate-700 hover:bg-slate-200',
                      'dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                      'transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500'
                    )}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>

                  {!tmpl.is_default && (
                    <button
                      type="button"
                      onClick={() => void handleSetDefault(tmpl.id)}
                      disabled={setDefaultMutation.isPending}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                        'bg-blue-50 text-blue-700 hover:bg-blue-100',
                        'dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30',
                        'disabled:opacity-50',
                        'transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500'
                      )}
                    >
                      <Star className="w-3.5 h-3.5" />
                      Jadikan Default
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(tmpl.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                      'bg-red-50 text-red-600 hover:bg-red-100',
                      'dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30',
                      'transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500'
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Editor Modal ────────────────────────────────────────── */}
      <Modal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
          setEditingTemplate(undefined)
        }}
        size="2xl"
      >
        <ModalHeader
          title={editingTemplate ? 'Edit Template' : 'Buat Template Baru'}
          onClose={() => {
            setEditorOpen(false)
            setEditingTemplate(undefined)
          }}
        />
        <ModalBody className="overflow-y-auto">
          <CertificateTemplateEditor
            template={editingTemplate}
            courseId={courseId}
            onSave={handleSaved}
            onCancel={() => {
              setEditorOpen(false)
              setEditingTemplate(undefined)
            }}
          />
        </ModalBody>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────── */}
      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} size="sm">
        <ModalHeader title="Hapus Template?" onClose={() => setConfirmDeleteId(null)} />
        <ModalBody>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tindakan ini tidak dapat dibatalkan. Template yang dihapus tidak bisa dipulihkan.
          </p>
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={() => confirmDeleteId && void handleDelete(confirmDeleteId)}
              disabled={deleteMutation.isPending}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-bold',
                'bg-red-600 text-white hover:bg-red-700',
                'dark:bg-red-500 dark:hover:bg-red-600',
                'disabled:opacity-50',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500'
              )}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-medium',
                'border border-slate-300 text-slate-700 hover:bg-slate-50',
                'dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'
              )}
            >
              Batal
            </button>
          </div>
        </ModalBody>
      </Modal>
    </>
  )
}
