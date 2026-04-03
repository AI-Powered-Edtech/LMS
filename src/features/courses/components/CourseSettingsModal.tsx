import { CheckCircle, GitBranch, Loader2, Settings, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { PathRuleList } from '@/features/adaptive-paths'
import { courseService } from '@/features/courses/api/courseService'

import { CourseCollaborators } from './CourseCollaborators'

interface CourseSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
}

// ── General Settings Tab ────────────────────────────────────

interface CourseGeneralData {
  title: string
  description: string
  subject: string
  level: string
}

function GeneralSettingsTab({ courseId }: { courseId: string }) {
  const { tenantId } = useAuth()
  const [data, setData] = useState<CourseGeneralData>({
    title: '',
    description: '',
    subject: '',
    level: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch course data on mount
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
        })
      } catch {
        if (cancelled) return
        setError('Gagal memuat data kursus.')
      }
      setLoading(false)
    }

    fetchCourse()

    return () => {
      cancelled = true
    }
  }, [courseId, tenantId])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // Debounced save
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
          await courseService.updateCourse(
            courseId,
            {
              title: updatedData.title,
              description: updatedData.description || null,
              subject: updatedData.subject || null,
              level: updatedData.level || null,
            },
            tenantId
          )

          setSaving(false)
          setSaved(true)
          savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
        } catch {
          setSaving(false)
          setError('Gagal menyimpan perubahan.')
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
      {/* Save status */}
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

      {/* Title */}
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

      {/* Description */}
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

      {/* Subject & Level — side by side */}
      <div className="grid grid-cols-2 gap-4">
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
          />
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
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────

export function CourseSettingsModal({ isOpen, onClose, courseId }: CourseSettingsModalProps) {
  const { tenantId } = useAuth()
  const [activeTab, setActiveTab] = useState<'general' | 'collaborators' | 'learning-path'>(
    'general'
  )
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const modal = modalRef.current
    if (!modal) return

    // Focus first focusable element
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length > 0) focusable[0].focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const currentFocusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstEl = currentFocusable[0]
      const lastEl = currentFocusable[currentFocusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleKeyDown)
    return () => modal.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2
              id="settings-modal-title"
              className="text-xl font-black text-slate-800 dark:text-slate-100"
            >
              Pengaturan Kursus
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Tutup pengaturan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-56 border-r border-slate-100 dark:border-slate-800 p-4 space-y-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'general'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                Umum
              </button>
              <button
                onClick={() => setActiveTab('collaborators')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'collaborators'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                Kolaborator
              </button>
              <button
                onClick={() => setActiveTab('learning-path')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'learning-path'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Alur Pembelajaran
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' ? (
                <GeneralSettingsTab courseId={courseId} />
              ) : activeTab === 'collaborators' ? (
                <CourseCollaborators courseId={courseId} />
              ) : (
                <PathRuleList courseId={courseId} tenantId={tenantId ?? ''} />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
