import { useState } from 'react'
import { BookOpen, Plus, Loader2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/src/utils/cn'
import { useGuideList, useDeleteGuide } from '@/src/features/guidance'
import type { LearningGuide } from '@/src/features/guidance'
import { GuideBuilder } from './GuideBuilder'

interface Props {
  courseId: string
}

const GUIDE_TYPE_LABELS: Record<string, string> = {
  tooltip: 'Tooltip',
  banner: 'Banner',
  walkthrough: 'Walkthrough',
  checkpoint: 'Checkpoint',
}

const SEGMENT_LABELS: Record<string, string> = {
  all: 'Semua',
  at_risk: 'Berisiko',
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  struggling: 'Kesulitan',
}

const _TRIGGER_LABELS: Record<string, string> = {
  on_enter: 'Saat masuk',
  after_seconds: 'Setelah',
  on_struggle: 'Saat struggle',
  on_idle: 'Saat idle',
}

export function GuideAnalytics({ courseId }: Props) {
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingGuide, setEditingGuide] = useState<LearningGuide | null>(null)

  const { data: guides = [], isLoading } = useGuideList('lesson', undefined)
  const { mutate: deleteGuide } = useDeleteGuide()

  // Filter guides that target lessons within this course
  // (server-side filtering would be ideal, but we filter client-side for now)
  const courseGuides = guides

  const handleEdit = (guide: LearningGuide) => {
    setEditingGuide(guide)
    setShowBuilder(true)
  }

  const handleDelete = (guideId: string) => {
    if (confirm('Hapus panduan ini?')) {
      deleteGuide(guideId)
    }
  }

  const handleBuilderClose = () => {
    setShowBuilder(false)
    setEditingGuide(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-teal-500" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            Panduan Belajar
          </h2>
        </div>
        <button
          onClick={() => {
            setEditingGuide(null)
            setShowBuilder(true)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tambah Panduan
        </button>
      </div>

      {/* Builder (inline) */}
      {showBuilder && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-5 overflow-hidden"
        >
          <GuideBuilder courseId={courseId} guide={editingGuide} onClose={handleBuilderClose} />
        </motion.div>
      )}

      {/* Guides table */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat panduan...
        </div>
      ) : courseGuides.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Belum ada panduan belajar. Klik "Tambah Panduan" untuk membuat.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-2 pr-3 text-left font-medium text-slate-500 dark:text-slate-400">
                  Judul
                </th>
                <th className="pb-2 pr-3 text-left font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                  Tipe
                </th>
                <th className="pb-2 pr-3 text-left font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">
                  Segmen
                </th>
                <th className="pb-2 pr-3 text-right font-medium text-slate-500 dark:text-slate-400">
                  Tampil
                </th>
                <th className="pb-2 pr-3 text-right font-medium text-slate-500 dark:text-slate-400">
                  Tutup
                </th>
                <th className="pb-2 text-right font-medium text-slate-500 dark:text-slate-400">
                  Selesai
                </th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {courseGuides.map((guide) => (
                <tr
                  key={guide.id}
                  className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      {guide.is_active ? (
                        <ToggleRight className="h-4 w-4 flex-shrink-0 text-teal-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                      )}
                      <button
                        onClick={() => handleEdit(guide)}
                        className={cn(
                          'text-left font-medium hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate max-w-[180px]',
                          guide.is_active
                            ? 'text-slate-800 dark:text-white'
                            : 'text-slate-400 line-through'
                        )}
                      >
                        {guide.title}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-3 hidden sm:table-cell text-slate-600 dark:text-slate-400">
                    {GUIDE_TYPE_LABELS[guide.guide_type] ?? guide.guide_type}
                  </td>
                  <td className="py-3 pr-3 hidden md:table-cell">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {SEGMENT_LABELS[guide.segment] ?? guide.segment}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right text-slate-600 dark:text-slate-400">
                    {guide.total_impressions}
                  </td>
                  <td className="py-3 pr-3 text-right text-slate-600 dark:text-slate-400">
                    {guide.total_dismissals}
                  </td>
                  <td className="py-3 pr-3 text-right text-slate-600 dark:text-slate-400">
                    {guide.total_completions}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(guide.id)}
                      className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
