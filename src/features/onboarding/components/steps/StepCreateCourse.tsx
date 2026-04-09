import { BookOpen, ChevronRight, Layers } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { courseService } from '@/features/courses/api/courseService'

interface StepCreateCourseProps {
  onNext: () => void
  onSkip: () => void
  onCourseCreated: (courseId: string) => void
  existingCourseId?: string | null
}

/**
 * Step 4 — Buat Materi Pertama: guru membuat kursus pertama.
 */
export function StepCreateCourse({
  onNext,
  onSkip,
  onCourseCreated,
  existingCourseId,
}: StepCreateCourseProps) {
  const { user, tenantId } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existingCourseId) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Kursus sudah dibuat!
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Kursus Anda telah berhasil dibuat sebelumnya.
        </p>
        <Button fullWidth onClick={onNext}>
          Lanjut <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  async function handleCreateCourse() {
    if (!title.trim()) {
      setError('Judul kursus wajib diisi.')
      return
    }
    if (!user || !tenantId) return

    setIsCreating(true)
    setError(null)

    try {
      const course = await courseService.createCourse({
        title: title.trim(),
        description: null,
        status: 'draft',
        subject: subject.trim() || null,
        tenant_id: tenantId,
        created_by: user.id,
      })
      if (!course?.id) {
        throw new Error('Gagal membuat kursus.')
      }

      onCourseCreated(course.id)
      onNext()
      setTimeout(() => {
        void navigate(`/app/teacher/course-builder?courseId=${course.id}`)
      }, 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kursus. Coba lagi.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Buat Materi Pertama</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mulai buat kursus pembelajaran
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Judul Kursus <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Aljabar Dasar, Teks Narasi"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Matematika, Bahasa Indonesia"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3">
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            📝 Setelah membuat kursus, Anda akan langsung diarahkan ke{' '}
            <strong>Course Builder</strong> untuk menambahkan modul dan materi pelajaran.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="ghost" size="sm" onClick={onSkip} className="flex-1">
          Nanti saja
        </Button>
        <Button
          size="md"
          className="flex-[2] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          loading={isCreating}
          onClick={handleCreateCourse}
          disabled={!title.trim()}
        >
          <Layers className="w-4 h-4" />
          Buat Kursus
        </Button>
      </div>
    </div>
  )
}
