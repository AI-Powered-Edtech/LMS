import { CheckCircle, Loader2, Settings, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { supabase } from '@/src/services/supabase/client'

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
      const { data: course, error: fetchErr } = await supabase
        .from('courses')
        .select('title, description, subject, level')
        .eq('id', courseId)
        .eq('tenant_id', tenantId)
        .single()

      if (cancelled) return

      if (fetchErr) {
        setError('Gagal memuat data kursus.')
        setLoading(false)
        return
      }

      setData({
        title: course.title || '',
        description: course.description || '',
        subject: course.subject || '',
        level: course.level || '',
      })
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

        const { error: updateErr } = await supabase
          .from('courses')
          .update({
            title: updatedData.title,
            description: updatedData.description || null,
            subject: updatedData.subject || null,
            level: updatedData.level || null,
          })
          .eq('id', courseId)
          .eq('tenant_id', tenantId)

        setSaving(false)

        if (updateErr) {
          setError('Gagal menyimpan perubahan.')
        } else {
          setSaved(true)
          savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
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
    'w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all'

  return (
    <div className="space-y-6">
      {/* Save status */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
          Informasi Kursus
        </h3>
        <div className="flex items-center gap-2 text-xs font-bold">
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

      {/* Title */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
          Judul Kursus
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className={inputClass}
          placeholder="Masukkan judul kursus..."
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
          Deskripsi
        </label>
        <textarea
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
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={data.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            className={inputClass}
            placeholder="Contoh: Matematika"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Tingkat
          </label>
          <select
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

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────

export function CourseSettingsModal({ isOpen, onClose, courseId }: CourseSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'collaborators'>('general')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Pengaturan Kursus
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
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
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' ? (
                <GeneralSettingsTab courseId={courseId} />
              ) : (
                <CourseCollaborators courseId={courseId} />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
