import { CheckCircle, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'

import { courseService } from '../api/courseService'

import { CourseCoverUploadSection } from './CourseCoverUploadSection'
import { CourseDangerZoneDeleteCourseSection } from './CourseDangerZoneDeleteCourseSection'

interface CourseGeneralData {
  title: string
  description: string
  subject: string
  level: string
  status: 'draft' | 'published' | 'archived'
}

const FALLBACK_SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'IPA',
  'IPS',
  'Informatika',
  'Fisika',
  'Kimia',
  'Biologi',
  'Ekonomi',
  'Sejarah',
  'Geografi',
  'Seni Budaya',
  'Pendidikan Agama',
  'PPKn',
]

export function CourseGeneralSettingsTab({ courseId }: { courseId: string }) {
  const { tenantId, user } = useAuth()
  const [data, setData] = useState<CourseGeneralData>({
    title: '',
    description: '',
    subject: '',
    level: '',
    status: 'draft',
  })
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [subjectOptions, setSubjectOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!courseId || !tenantId) return

    let cancelled = false

    async function fetchCourse() {
      setLoading(true)
      try {
        const course = await courseService.getCourseById(courseId, tenantId!)
        if (cancelled) return

        setData({
          title: course.title || '',
          description: course.description || '',
          subject: course.subject || '',
          level: course.level || '',
          status: course.status || 'draft',
        })
        setCoverUrl(course.cover_url || null)
      } catch {
        if (cancelled) return
        setError('Gagal memuat data kursus.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCourse()

    return () => {
      cancelled = true
    }
  }, [courseId, tenantId])

  useEffect(() => {
    if (!tenantId) return

    let cancelled = false

    ;(async () => {
      try {
        const { data: courses } = await courseService.fetchCourses({
          tenantId: tenantId!,
          limit: 200,
          page: 1,
        })
        if (cancelled) return
        const list = (courses || []) as Array<{ subject?: string | null }>
        const derived = Array.from(
          new Set(list.map((c) => (c.subject || '').trim()).filter((s) => s.length > 0))
        )
        const merged = Array.from(new Set([...derived, ...FALLBACK_SUBJECTS])).sort((a, b) =>
          a.localeCompare(b, 'id')
        )
        setSubjectOptions(merged)
      } catch {
        if (cancelled) return
        setSubjectOptions(FALLBACK_SUBJECTS)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tenantId])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const debouncedSave = useCallback(
    (updatedData: CourseGeneralData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

      saveTimerRef.current = setTimeout(async () => {
        if (!courseId || !tenantId) return

        setSaving(true)
        setSaved(false)
        setError(null)

        try {
          await courseService.updateCourse(courseId, updatedData, tenantId)
          setSaved(true)
          savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
        } catch {
          setError('Gagal menyimpan perubahan.')
        } finally {
          setSaving(false)
        }
      }, 800)
    },
    [courseId, tenantId]
  )

  const handleChange = (field: keyof CourseGeneralData, value: string) => {
    const updated = { ...data, [field]: value }
    setData(updated)
    debouncedSave(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    )
  }

  const inputClass =
    'w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
          Informasi Kursus
        </h3>
        <div className="flex items-center gap-2 text-xs font-bold">
          <div aria-live="polite" aria-atomic="true">
            {saving && (
              <span className="flex items-center gap-1.5 text-amber-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Menyimpan...
              </span>
            )}
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                Tersimpan
              </span>
            )}
          </div>
        </div>
      </div>

      {tenantId && user?.id && (
        <CourseCoverUploadSection
          courseId={courseId}
          tenantId={tenantId}
          userId={user.id}
          coverUrl={coverUrl}
          onCoverUrlChange={setCoverUrl}
        />
      )}

      <div>
        <label
          htmlFor="settings-title"
          className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
        >
          Judul Kursus
        </label>
        <input
          id="settings-title"
          type="text"
          value={data.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className={inputClass}
          placeholder="Masukkan judul kursus..."
        />
      </div>

      <div>
        <label
          htmlFor="settings-description"
          className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
        >
          Deskripsi
        </label>
        <textarea
          id="settings-description"
          value={data.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className={`${inputClass} resize-none`}
          placeholder="Deskripsi singkat tentang kursus ini..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="settings-subject"
            className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
          >
            Mata Pelajaran
          </label>
          <input
            id="settings-subject"
            type="text"
            value={data.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            className={inputClass}
            placeholder="Contoh: Matematika"
            list="course-subject-options"
          />
          <datalist id="course-subject-options">
            {subjectOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label
            htmlFor="settings-level"
            className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
          >
            Tingkat
          </label>
          <select
            id="settings-level"
            value={data.level}
            onChange={(e) => handleChange('level', e.target.value)}
            className={inputClass}
          >
            <option value="">Pilih tingkat...</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
            <option value="SMK">SMK</option>
            <option value="Universitas">Universitas</option>
            <option value="Umum">Umum</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="settings-status"
            className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
          >
            Status
          </label>
          <select
            id="settings-status"
            value={data.status}
            onChange={(e) => handleChange('status', e.target.value as CourseGeneralData['status'])}
            className={inputClass}
          >
            <option value="draft">Draf</option>
            <option value="published">Dipublikasi</option>
            <option value="archived">Arsip</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {tenantId && <CourseDangerZoneDeleteCourseSection courseId={courseId} tenantId={tenantId} courseTitle={data.title} />}
    </div>
  )
}
