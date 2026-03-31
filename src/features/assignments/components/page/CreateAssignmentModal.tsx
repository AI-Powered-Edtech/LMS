import { valibotResolver } from '@hookform/resolvers/valibot'
import { FileText, FileUp, Link as LinkIcon, Paperclip, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type Resolver, useForm } from 'react-hook-form'

import { OfflineFormNotice } from '@/components/ui/OfflineFormNotice'
import { type AssignmentFormData, AssignmentFormSchema } from '@/shared/schemas/forms'

export interface NewAssignmentData extends AssignmentFormData {
  class: string
  type: 'individual' | 'group'
}

interface CreateAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: NewAssignmentData) => void
}

const INPUT_CLS =
  'w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white aria-[invalid=true]:border-red-400'

export function CreateAssignmentModal({ isOpen, onClose, onCreate }: CreateAssignmentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormData>({
    resolver: valibotResolver(AssignmentFormSchema) as unknown as Resolver<AssignmentFormData>,
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      max_score: 100,
    },
  })

  const onSubmit = (data: AssignmentFormData) => {
    onCreate({
      ...data,
      class: 'Semua Kelas Aktif',
      type: 'individual',
    })
    reset()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Buat Tugas Baru
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tugas akan disinkronkan dengan Google Classroom
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup modal"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="create-assignment-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/50 dark:bg-slate-950/50"
            >
              <OfflineFormNotice />

              <div className="space-y-1.5">
                <label
                  htmlFor="ca-title"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Judul Tugas
                </label>
                <input
                  id="ca-title"
                  type="text"
                  {...register('title')}
                  placeholder="Contoh: Esai Sejarah Kemerdekaan"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'ca-title-error' : undefined}
                  className={INPUT_CLS}
                />
                {errors.title && (
                  <p id="ca-title-error" className="text-xs text-red-500 mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="ca-description"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Petunjuk (Opsional)
                </label>
                <textarea
                  id="ca-description"
                  rows={4}
                  {...register('description')}
                  placeholder="Berikan instruksi yang jelas untuk siswa..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label
                    htmlFor="ca-max-score"
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  >
                    Poin Maksimal
                  </label>
                  <input
                    id="ca-max-score"
                    type="number"
                    {...register('max_score', { valueAsNumber: true })}
                    aria-invalid={!!errors.max_score}
                    aria-describedby={errors.max_score ? 'ca-max-score-error' : undefined}
                    className={INPUT_CLS}
                  />
                  {errors.max_score && (
                    <p id="ca-max-score-error" className="text-xs text-red-500 mt-1">
                      {errors.max_score.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="ca-due-date"
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  >
                    Tenggat Waktu
                  </label>
                  <input
                    id="ca-due-date"
                    type="datetime-local"
                    {...register('due_date')}
                    aria-invalid={!!errors.due_date}
                    aria-describedby={errors.due_date ? 'ca-due-date-error' : undefined}
                    className={INPUT_CLS}
                  />
                  {errors.due_date && (
                    <p id="ca-due-date-error" className="text-xs text-red-500 mt-1">
                      {errors.due_date.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Lampiran & Integrasi GCR
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled
                    title="Fitur segera hadir"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm font-bold rounded-xl cursor-not-allowed opacity-60"
                  >
                    <FileUp className="w-4 h-4" /> Google Drive
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Fitur segera hadir"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm font-bold rounded-xl cursor-not-allowed opacity-60"
                  >
                    <LinkIcon className="w-4 h-4" /> Link
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Fitur segera hadir"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm font-bold rounded-xl cursor-not-allowed opacity-60"
                  >
                    <Paperclip className="w-4 h-4" /> Upload File
                  </button>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
              <button
                type="button"
                disabled
                title="Fitur segera hadir"
                className="text-slate-400 dark:text-slate-500 font-bold text-sm cursor-not-allowed opacity-60"
              >
                Jadwalkan
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="create-assignment-form"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-2"
                >
                  Tugaskan
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
