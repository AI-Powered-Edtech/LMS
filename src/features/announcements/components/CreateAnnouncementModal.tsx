// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Paperclip, Send, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type Resolver, useForm } from 'react-hook-form'

import { OfflineFormNotice } from '@/src/components/ui/OfflineFormNotice'
import { type AnnouncementFormData, AnnouncementFormSchema } from '@/src/shared/schemas/forms'

interface ExtendedFormData extends AnnouncementFormData {
  target_audience: 'all_students' | 'course_students' | 'course_staff' | 'system'
  is_pinned: boolean
  allow_comments: boolean
  requires_rsvp: boolean
  location: string
  contact_person: string
  course_id: string | null
}

interface CreateAnnouncementModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: ExtendedFormData, status: 'draft' | 'published') => Promise<void>
  isPending: boolean
}

const EXTRA_DEFAULTS = {
  target_audience: 'all_students' as const,
  is_pinned: false,
  allow_comments: true,
  requires_rsvp: false,
  location: '',
  contact_person: '',
  course_id: null,
}

export function CreateAnnouncementModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: CreateAnnouncementModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExtendedFormData>({
    resolver: valibotResolver(AnnouncementFormSchema) as unknown as Resolver<ExtendedFormData>,
    defaultValues: {
      title: '',
      content: '',
      priority: 'normal',
      ...EXTRA_DEFAULTS,
    },
  })

  const is_pinned = watch('is_pinned')
  const allow_comments = watch('allow_comments')
  const requires_rsvp = watch('requires_rsvp')

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data, 'published')
    reset({ title: '', content: '', priority: 'normal', ...EXTRA_DEFAULTS })
  })

  const handleDraft = handleSubmit(async (data) => {
    await onSubmit(data, 'draft')
    reset({ title: '', content: '', priority: 'normal', ...EXTRA_DEFAULTS })
  })

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
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Buat Pengumuman Baru
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup modal"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="announcement-form"
              onSubmit={handleFormSubmit}
              noValidate
              className="p-6 overflow-y-auto custom-scrollbar space-y-6"
            >
              <OfflineFormNotice />

              <div className="space-y-1.5">
                <label
                  htmlFor="ann-title"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Judul Pengumuman
                </label>
                <input
                  id="ann-title"
                  type="text"
                  {...register('title')}
                  placeholder="Contoh: Libur Nasional Idul Fitri"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'ann-title-error' : undefined}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 aria-[invalid=true]:border-red-400"
                />
                {errors.title && (
                  <p id="ann-title-error" className="text-xs text-red-500 mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="ann-content"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Isi Pengumuman
                </label>
                <textarea
                  id="ann-content"
                  rows={5}
                  {...register('content')}
                  placeholder="Tuliskan detail pengumuman di sini..."
                  aria-invalid={!!errors.content}
                  aria-describedby={errors.content ? 'ann-content-error' : undefined}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-900 dark:text-slate-100 aria-[invalid=true]:border-red-400"
                />
                {errors.content && (
                  <p id="ann-content-error" className="text-xs text-red-500 mt-1">
                    {errors.content.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                <div className="space-y-1.5">
                  <label
                    htmlFor="ann-audience"
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  >
                    Target Penerima
                  </label>
                  <select
                    id="ann-audience"
                    {...register('target_audience')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="all_students">Semua Siswa</option>
                    <option value="course_students">Siswa Kursus Tertentu</option>
                    <option value="course_staff">Hanya Staf Kursus</option>
                    <option value="system">Sistem (Admin Saja)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="ann-priority"
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  >
                    Prioritas
                  </label>
                  <select
                    id="ann-priority"
                    {...register('priority')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Tinggi (Darurat)</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="ann-location"
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  >
                    Lokasi (Opsional)
                  </label>
                  <input
                    id="ann-location"
                    type="text"
                    {...register('location')}
                    placeholder="Contoh: Aula Serbaguna"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="ann-contact"
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  >
                    Narahubung (Opsional)
                  </label>
                  <input
                    id="ann-contact"
                    type="text"
                    {...register('contact_person')}
                    placeholder="Contoh: Ibu Rina (0812...)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-6">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Pengaturan Tambahan
                </label>

                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={is_pinned}
                    onChange={(e) => setValue('is_pinned', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Sematkan di Atas (Pin)
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pengumuman akan selalu muncul di urutan pertama.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={allow_comments}
                    onChange={(e) => setValue('allow_comments', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Izinkan Komentar
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Siswa dan staf dapat berdiskusi di kolom komentar.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={requires_rsvp}
                    onChange={(e) => setValue('requires_rsvp', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Wajib Konfirmasi (RSVP)
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Penerima harus memberikan respon (ya/tidak).
                    </p>
                  </div>
                </label>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Paperclip className="w-4 h-4" /> Tambah Lampiran
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDraft}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  Simpan Draf
                </button>
                <button
                  type="submit"
                  form="announcement-form"
                  disabled={isPending}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Terbitkan
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
