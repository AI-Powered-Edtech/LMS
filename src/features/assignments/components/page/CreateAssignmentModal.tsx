import { FileText, FileUp, Link as LinkIcon, Paperclip, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

interface NewAssignment {
  title: string
  description: string
  dueDate: string
  maxGrade: number
  class: string
  type: 'individual' | 'group'
}

interface CreateAssignmentModalProps {
  isOpen: boolean
  assignment: NewAssignment
  onClose: () => void
  onChange: (assignment: NewAssignment) => void
  onCreate: () => void
}

export function CreateAssignmentModal({
  isOpen,
  assignment,
  onClose,
  onChange,
  onCreate,
}: CreateAssignmentModalProps) {
  const update = (field: keyof NewAssignment, value: string | number) => {
    onChange({ ...assignment, [field]: value })
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
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Judul Tugas
                </label>
                <input
                  type="text"
                  value={assignment.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Contoh: Esai Sejarah Kemerdekaan"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Petunjuk (Opsional)
                </label>
                <textarea
                  rows={4}
                  value={assignment.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Berikan instruksi yang jelas untuk siswa..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Jenis Tugas
                  </label>
                  <select
                    value={assignment.type}
                    onChange={(e) => update('type', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="individual">Individu</option>
                    <option value="group">Kelompok</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Kelas
                  </label>
                  <select
                    value={assignment.class}
                    onChange={(e) => update('class', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option>Semua Kelas Aktif</option>
                    <option>Kelas 12 IPA 1</option>
                    <option>Kelas 12 IPS 2</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Siswa
                  </label>
                  <select className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                    <option>Semua Siswa</option>
                    <option>Pilih Siswa Tertentu...</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Poin Maksimal
                  </label>
                  <input
                    type="number"
                    value={assignment.maxGrade}
                    onChange={(e) => update('maxGrade', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Tenggat Waktu (Due Date)
                  </label>
                  <input
                    type="datetime-local"
                    value={assignment.dueDate}
                    onChange={(e) => update('dueDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Lampiran & Integrasi GCR
                </label>
                <div className="flex flex-wrap gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 text-sm font-bold rounded-xl transition-all">
                    <FileUp className="w-4 h-4" /> Google Drive
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 text-sm font-bold rounded-xl transition-all">
                    <LinkIcon className="w-4 h-4" /> Link
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 text-sm font-bold rounded-xl transition-all">
                    <Paperclip className="w-4 h-4" /> Upload File
                  </button>
                </div>

                <div className="mt-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Template_Tugas.docx
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Google Docs</p>
                    </div>
                  </div>
                  <select className="text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                    <option>Siswa dapat melihat file</option>
                    <option>Siswa dapat mengedit file</option>
                    <option>Buat salinan untuk tiap siswa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Cek Plagiarisme (Originality Reports)
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bandingkan tugas siswa dengan halaman web dan buku.
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Tambahkan Rubrik Penilaian
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Gunakan rubrik untuk menilai dan memberikan umpan balik.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
              <button className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-sm transition-colors">
                Jadwalkan
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={onCreate}
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
