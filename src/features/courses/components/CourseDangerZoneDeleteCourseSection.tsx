import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConfirmModal } from '@/src/components/ui'

import { courseService } from '../api/courseService'

export function CourseDangerZoneDeleteCourseSection({
  courseId,
  tenantId,
  courseTitle,
}: {
  courseId: string
  tenantId: string
  courseTitle: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    await courseService.deleteCourse(courseId, tenantId)
    navigate('/app/teacher/courses', { replace: true })
  }

  return (
    <>
      <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black text-red-700 dark:text-red-300 uppercase tracking-widest">
              Danger Zone
            </p>
            <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-1 leading-relaxed">
              Menghapus kursus akan menghilangkan seluruh modul, lesson, dan konten terkait. Tindakan
              ini tidak dapat dibatalkan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Kursus
          </button>
        </div>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        title="Hapus kursus ini?"
        description={
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Seluruh konten di kursus ini akan terhapus.
            </p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Kursus: {courseTitle || 'Tanpa judul'}
            </p>
          </div>
        }
        confirmText="Ya, hapus"
        cancelText="Batal"
        onConfirm={handleConfirm}
        danger
      />
    </>
  )
}

