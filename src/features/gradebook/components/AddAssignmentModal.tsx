import { X } from 'lucide-react'

import type { Assignment } from '@/src/features/gradebook/hooks/useGradebookQueries'

interface AddAssignmentModalProps {
  isOpen: boolean
  newAssignment: Partial<Assignment>
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onUpdate: (assignment: Partial<Assignment>) => void
}

export function AddAssignmentModal({
  isOpen,
  newAssignment,
  onClose,
  onSubmit,
  onUpdate,
}: AddAssignmentModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Kolom Nilai</h3>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Judul Tugas/Aktivitas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newAssignment.title}
              onChange={(e) => onUpdate({ ...newAssignment, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Contoh: Ujian Harian 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipe Aktivitas
            </label>
            <select
              value={newAssignment.type}
              onChange={(e) =>
                onUpdate({
                  ...newAssignment,
                  type: e.target.value as Assignment['type'],
                })
              }
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="assignment">Tugas (Assignment)</option>
              <option value="quiz">Kuis (Quiz)</option>
              <option value="project">Proyek (Project)</option>
              <option value="exam">Ujian (Exam)</option>
              <option value="presentation">Presentasi (Presentation)</option>
              <option value="offline">Aktivitas Offline (Offline)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Skor Maksimal <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={newAssignment.maxScore}
                onChange={(e) => onUpdate({ ...newAssignment, maxScore: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tanggal
              </label>
              <input
                type="text"
                value={newAssignment.date}
                onChange={(e) => onUpdate({ ...newAssignment, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="Contoh: 12 Okt"
              />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
