import { Accessibility, Bell, Globe, Lock, LogOut, Monitor, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { type Theme, useTheme } from '@/contexts/ThemeContext'
import { FontSizeControl, HighContrastToggle, KeyboardShortcutHelp } from '@/features/accessibility'
import { NotificationPreferencesPanel } from '@/features/notifications'
import { profilePreferences } from '@/features/profile/api/profilePreferences'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'
import { captureError } from '@/utils/sentry'

import { AccountTab, AppearanceTab, SecurityTab } from './SettingsTabs'

type SettingsTab =
  | 'account'
  | 'notifications'
  | 'security'
  | 'appearance'
  | 'language'
  | 'accessibility'

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Akun & Profil', icon: User },
  { id: 'notifications', label: 'Notifikasi', icon: Bell },
  { id: 'security', label: 'Keamanan', icon: Lock },
  { id: 'appearance', label: 'Tampilan', icon: Monitor },
  { id: 'language', label: 'Bahasa & Wilayah', icon: Globe },
  { id: 'accessibility', label: 'Aksesibilitas', icon: Accessibility },
]

// FIXED: Added missing role labels for parent and principal
const ROLE_LABELS: Record<string, string> = {
  teacher: 'Guru',
  student: 'Siswa',
  admin: 'Administrator',
  parent: 'Orang Tua', // FIXED: add parent
  principal: 'Kepala Sekolah', // FIXED: add principal
}

export function Settings() {
  usePageTitle('Pengaturan')
  const { role, user, profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  const initLocale = user ? profilePreferences.getLocalePreferences(user.id) : null
  const [language, setLanguage] = useState(initLocale?.language ?? 'id')
  const [timezone, setTimezone] = useState(initLocale?.timezone ?? 'Asia/Jakarta')
  // FIXED: Controlled date format state — persists on save instead of using uncontrolled defaultValue
  const [dateFormat, setDateFormat] = useState(initLocale?.dateFormat ?? 'dd/mm/yyyy')

  // FIXED: Include dateFormat in locale preferences persistence
  useEffect(() => {
    if (user) {
      profilePreferences.updateLocalePreferences(user.id, { language, timezone, dateFormat })
    }
  }, [language, timezone, dateFormat, user])

  // NOTE: Profile editing and password changing are handled inside AccountTab and
  // SecurityTab components respectively — they own their own state. This page-level
  // component only handles sign-out and notification preference toggles.

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
    } catch (e) {
      if (import.meta.env.DEV) logger.error('[Settings] signOut error:', e)
      captureError(e, { context: 'Settings.handleSignOut' })
    }
  }, [signOut])

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : ((user?.user_metadata?.full_name as string) ?? '')

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Pengaturan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Kelola preferensi akun, notifikasi, dan tampilan aplikasi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar nav */}
        <div className="space-y-2" role="tablist" aria-orientation="vertical">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setActiveTab(tab.id)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === 'account' && (
            <AccountTab
              userId={user?.id ?? ''}
              avatarUrl={profile?.avatar_url}
              displayEmail={user?.email ?? ''}
              roleLabel={ROLE_LABELS[role] ?? role}
              displayName={displayName}
            />
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Preferensi Notifikasi
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Pilih saluran pemberitahuan untuk setiap jenis notifikasi. Perubahan tersimpan
                    otomatis.
                  </p>
                </div>
                {/* Enhanced per-type × per-channel matrix panel */}
                <NotificationPreferencesPanel embedded />
              </div>
            </div>
          )}

          {activeTab === 'security' && <SecurityTab />}

          {activeTab === 'appearance' && (
            <AppearanceTab theme={theme as Theme} setTheme={setTheme} />
          )}

          {activeTab === 'accessibility' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aksesibilitas</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Sesuaikan tampilan dan kontrol untuk pengalaman yang lebih nyaman.
                </p>
              </div>
              <div className="p-6">
                <section aria-labelledby="a11y-heading">
                  <h2
                    id="a11y-heading"
                    className="text-base font-semibold text-slate-900 dark:text-white mb-4 sr-only"
                  >
                    Aksesibilitas
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Mode Kontras Tinggi
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tingkatkan kontras untuk keterbacaan lebih baik
                        </p>
                      </div>
                      <HighContrastToggle />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Ukuran Teks
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Sesuaikan ukuran teks tampilan
                        </p>
                      </div>
                      <FontSizeControl />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Pintasan Keyboard
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tekan Shift+? untuk melihat semua pintasan
                        </p>
                      </div>
                      <KeyboardShortcutHelp />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Bahasa & Wilayah
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Pengaturan bahasa dan format regional.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Bahasa
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  >
                    <option value="id">Bahasa Indonesia</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Zona Waktu
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  >
                    <option value="Asia/Jakarta">WIB (UTC+7) — Jakarta</option>
                    <option value="Asia/Makassar">WITA (UTC+8) — Makassar</option>
                    <option value="Asia/Jayapura">WIT (UTC+9) — Jayapura</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Format Tanggal
                  </label>
                  {/* FIXED: Controlled value+onChange replaces uncontrolled defaultValue */}
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  >
                    <option value="dd/mm/yyyy">DD/MM/YYYY (31/12/2026)</option>
                    <option value="yyyy-mm-dd">YYYY-MM-DD (2026-12-31)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone — always visible */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                Zona Berbahaya
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Tindakan di bawah ini tidak dapat dibatalkan.
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Keluar Akun
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
