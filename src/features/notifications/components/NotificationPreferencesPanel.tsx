import { Bell, Mail, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/src/utils/cn'

import { useNotificationPreferences } from '../hooks/useNotifications'
import type { NotificationType } from '../types'

// ─── Type Labels ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<NotificationType, string> = {
  grade_posted: 'Nilai diposting',
  assignment_due: 'Tugas mendekati batas waktu',
  quiz_available: 'Kuis tersedia',
  announcement: 'Pengumuman',
  course_enrolled: 'Pendaftaran kursus',
  badge_earned: 'Lencana diperoleh',
  discussion_reply: 'Balasan diskusi',
  system: 'Sistem',
  grade: 'Nilai (warisan)',
}

const ALL_TOGGLE_TYPES: NotificationType[] = [
  'grade_posted',
  'assignment_due',
  'quiz_available',
  'announcement',
  'course_enrolled',
  'badge_earned',
  'discussion_reply',
  'system',
]

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (val: boolean) => void
  label: string
  description?: string
  icon?: React.ReactNode
}

function Toggle({ id, checked, onChange, label, description, icon }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start justify-between gap-4 py-3 cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-slate-400 dark:text-slate-500">{icon}</div>}
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
            {label}
          </p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </label>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function NotificationPreferencesPanel() {
  const { preferences, isLoading, save, isSaving } = useNotificationPreferences()

  const [emailEnabled, setEmailEnabled] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [disabledTypes, setDisabledTypes] = useState<Set<NotificationType>>(new Set())

  // Sync from loaded preferences
  useEffect(() => {
    if (!preferences) return
    setEmailEnabled(preferences.email_enabled)
    setPushEnabled(preferences.push_enabled)
    setDisabledTypes(new Set(preferences.disabled_types ?? []))
  }, [preferences])

  function toggleType(type: NotificationType) {
    setDisabledTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function handleSave() {
    save({
      email_enabled: emailEnabled,
      push_enabled: pushEnabled,
      disabled_types: Array.from(disabledTypes),
    })
  }

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Pengaturan Notifikasi
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Kelola cara Anda menerima notifikasi
        </p>
      </div>

      <div className="px-5 py-2">
        {/* Channel toggles */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-3 mb-1">
            Saluran
          </p>
          <Toggle
            id="pref-email"
            checked={emailEnabled}
            onChange={setEmailEnabled}
            label="Notifikasi Email"
            description="Terima notifikasi melalui alamat email Anda"
            icon={<Mail className="w-4 h-4" />}
          />
          <Toggle
            id="pref-push"
            checked={pushEnabled}
            onChange={setPushEnabled}
            label="Notifikasi Push"
            description="Terima notifikasi langsung di browser"
            icon={<Smartphone className="w-4 h-4" />}
          />
        </div>

        {/* Per-type toggles */}
        <div className="pb-2">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-3 mb-1">
            Jenis Notifikasi
          </p>
          {ALL_TOGGLE_TYPES.map((type) => (
            <Toggle
              key={type}
              id={`pref-type-${type}`}
              checked={!disabledTypes.has(type)}
              onChange={() => toggleType(type)}
              label={TYPE_LABELS[type]}
              icon={<Bell className="w-4 h-4" />}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'w-full py-2 px-4 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
            isSaving
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500'
          )}
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  )
}
