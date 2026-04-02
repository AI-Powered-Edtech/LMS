/**
 * NotificationPreferencesPanel — Per-type × per-channel notification preferences.
 *
 * Layout: table where rows = notification type, columns = In-App / Email / Push.
 * Preferences stored in localStorage via useNotificationPreferencesLocal.
 *
 * - Bahasa Indonesia labels
 * - Full dark mode support
 * - Accessible toggle switches
 * - "Reset ke Default" with saved-state indicator
 */

import { Bell, Check, Mail, RotateCcw, Smartphone } from 'lucide-react'
import { useCallback, useState } from 'react'

import { cn } from '@/utils/cn'

import {
  type NotificationChannel,
  type NotificationPrefType,
  PREF_TYPE_LABELS,
  useNotificationPreferencesLocal,
} from '../hooks/useNotificationPreferences'

// ─── Channel config ───────────────────────────────────────────────────────────

const CHANNELS: { key: NotificationChannel; label: string; icon: React.ReactNode }[] = [
  {
    key: 'inApp',
    label: 'In-App',
    icon: <Bell className="w-3.5 h-3.5" />,
  },
  {
    key: 'email',
    label: 'Email',
    icon: <Mail className="w-3.5 h-3.5" />,
  },
  {
    key: 'push',
    label: 'Push',
    icon: <Smartphone className="w-3.5 h-3.5" />,
  },
]

const PREF_TYPES: NotificationPrefType[] = [
  'assignment_due',
  'quiz_result',
  'grade_posted',
  'message_received',
  'announcement',
  'system_alert',
]

// ─── Cell Toggle ──────────────────────────────────────────────────────────────

interface CellToggleProps {
  id: string
  checked: boolean
  onChange: (val: boolean) => void
  label: string
}

function CellToggle({ id, checked, onChange, label }: CellToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500',
        'focus:ring-offset-2 dark:focus:ring-offset-slate-900',
        checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
          'ring-0 transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface NotificationPreferencesPanelProps {
  /** If true, renders a compact version without card border (for embedding in Settings) */
  embedded?: boolean
}

export function NotificationPreferencesPanel({
  embedded = false,
}: NotificationPreferencesPanelProps) {
  const { preferences, updatePreference, resetToDefaults } = useNotificationPreferencesLocal()

  const [savedIndicator, setSavedIndicator] = useState(false)

  const handleChange = useCallback(
    (type: NotificationPrefType, channel: NotificationChannel, val: boolean) => {
      updatePreference(type, channel, val)
      // Flash saved indicator
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2000)
    },
    [updatePreference]
  )

  const handleReset = useCallback(() => {
    resetToDefaults()
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 2000)
  }, [resetToDefaults])

  const content = (
    <>
      {/* Header */}
      {!embedded && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Pengaturan Notifikasi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pilih saluran pemberitahuan untuk setiap jenis notifikasi
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="grid" aria-label="Pengaturan saluran notifikasi">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Jenis Notifikasi
              </th>
              {CHANNELS.map((ch) => (
                <th
                  key={ch.key}
                  scope="col"
                  className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[72px]"
                >
                  <span className="flex items-center justify-center gap-1">
                    <span aria-hidden="true">{ch.icon}</span>
                    {ch.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {PREF_TYPES.map((type) => (
              <tr
                key={type}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {PREF_TYPE_LABELS[type]}
                  </span>
                </td>
                {CHANNELS.map((ch) => (
                  <td key={ch.key} className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <CellToggle
                        id={`pref-${type}-${ch.key}`}
                        checked={preferences[type][ch.key]}
                        onChange={(val) => handleChange(type, ch.key, val)}
                        label={`${PREF_TYPE_LABELS[type]} — ${ch.label}`}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReset}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-slate-400 rounded'
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset ke Default
        </button>

        {/* Saved indicator */}
        <span
          aria-live="polite"
          className={cn(
            'flex items-center gap-1 text-xs font-medium transition-opacity duration-300',
            savedIndicator
              ? 'opacity-100 text-green-600 dark:text-green-400'
              : 'opacity-0 text-green-600 dark:text-green-400'
          )}
        >
          <Check className="w-3.5 h-3.5" />
          Tersimpan
        </span>
      </div>
    </>
  )

  if (embedded) {
    return <div>{content}</div>
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {content}
    </div>
  )
}
