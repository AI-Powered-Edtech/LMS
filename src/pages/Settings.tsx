import { Bell, Globe, Lock, LogOut, Monitor, User } from 'lucide-react'
import { useCallback, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { useTheme } from '@/src/contexts/ThemeContext'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { cn } from '@/src/utils/cn'
import { captureError } from '@/src/utils/sentry'

import { AccountTab, AppearanceTab, SecurityTab, ToggleRow } from './SettingsTabs'

type SettingsTab = 'account' | 'notifications' | 'security' | 'appearance' | 'language'

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Akun & Profil', icon: User },
  { id: 'notifications', label: 'Notifikasi', icon: Bell },
  { id: 'security', label: 'Keamanan', icon: Lock },
  { id: 'appearance', label: 'Tampilan', icon: Monitor },
  { id: 'language', label: 'Bahasa & Wilayah', icon: Globe },
]

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Guru',
  student: 'Siswa',
  admin: 'Administrator',
}

export function Settings() {
  usePageTitle('Pengaturan')
  const { role, user, profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  const [notifEmail, setNotifEmail] = useState(true)
  const [notifPush, setNotifPush] = useState(true)
  const [notifAssignment, setNotifAssignment] = useState(true)
  const [notifGrade, setNotifGrade] = useState(true)
  const [notifAnnouncement, setNotifAnnouncement] = useState(true)

  // NOTE: Profile editing and password changing are handled inside AccountTab and
  // SecurityTab components respectively — they own their own state. This page-level
  // component only handles sign-out and notification preference toggles.

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Settings] signOut error:', e)
      captureError(e, { context: 'Settings.handleSignOut' })
    }
  }, [signOut])

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : (user?.user_metadata?.full_name ?? '')

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
        <div className="space-y-2">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setActiveTab(tab.id)
              }}
              aria-pressed={activeTab === tab.id}
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
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Preferensi Notifikasi
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Atur jenis notifikasi yang ingin Anda terima.
                </p>
              </div>
              <div className="p-6 space-y-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Saluran
                </h3>
                <ToggleRow
                  label="Notifikasi Email"
                  description="Terima pemberitahuan melalui email"
                  checked={notifEmail}
                  onChange={setNotifEmail}
                />
                <ToggleRow
                  label="Notifikasi Push"
                  description="Terima notifikasi push di browser"
                  checked={notifPush}
                  onChange={setNotifPush}
                />
                <div className="border-t border-slate-100 dark:border-slate-700 pt-5 mt-5">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                    Kategori
                  </h3>
                  <div className="space-y-4">
                    <ToggleRow
                      label="Tugas & Kuis"
                      description="Tugas baru, tenggat, dan hasil kuis"
                      checked={notifAssignment}
                      onChange={setNotifAssignment}
                    />
                    <ToggleRow
                      label="Nilai & Umpan Balik"
                      description="Penilaian baru dan komentar guru"
                      checked={notifGrade}
                      onChange={setNotifGrade}
                    />
                    <ToggleRow
                      label="Pengumuman"
                      description="Pengumuman kelas dan sekolah"
                      checked={notifAnnouncement}
                      onChange={setNotifAnnouncement}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && <SecurityTab />}

          {activeTab === 'appearance' && (
            <AppearanceTab theme={theme as Theme} setTheme={setTheme} />
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
                    defaultValue="id"
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
                    defaultValue="Asia/Jakarta"
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
                  <select
                    defaultValue="dd/mm/yyyy"
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
