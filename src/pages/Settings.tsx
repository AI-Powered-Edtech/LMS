import {
  Bell,
  Camera,
  Eye,
  EyeOff,
  Globe,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Save,
  Sun,
  User,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { OptimizedImage } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import type { Theme } from '@/src/contexts/ThemeContext'
import { useTheme } from '@/src/contexts/ThemeContext'
import { settingsService } from '@/src/features/settings/api/settingsService'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { cn } from '@/src/utils/cn'
import { captureError } from '@/src/utils/sentry'

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

  // Account form state
  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : (user?.user_metadata?.full_name ?? '')
  const displayEmail = user?.email ?? ''
  const [fullName, setFullName] = useState(displayName)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Notification preferences state
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifPush, setNotifPush] = useState(true)
  const [notifAssignment, setNotifAssignment] = useState(true)
  const [notifGrade, setNotifGrade] = useState(true)
  const [notifAnnouncement, setNotifAnnouncement] = useState(true)

  const handleSaveProfile = useCallback(async () => {
    if (!fullName.trim()) return
    setSavingProfile(true)
    setProfileMessage(null)
    try {
      const [firstName, ...rest] = fullName.trim().split(' ')
      const lastName = rest.join(' ')
      await settingsService.updateProfile(user!.id, { firstName, lastName })
      setProfileMessage({ type: 'success', text: 'Profil berhasil diperbarui.' })
    } catch {
      setProfileMessage({ type: 'error', text: 'Gagal memperbarui profil. Coba lagi.' })
    } finally {
      setSavingProfile(false)
    }
  }, [fullName, user])

  const handleChangePassword = useCallback(async () => {
    setPasswordMessage(null)
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' })
      return
    }
    setSavingPassword(true)
    try {
      await settingsService.changePassword(newPassword)
      setPasswordMessage({ type: 'success', text: 'Kata sandi berhasil diubah.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordMessage({
        type: 'error',
        text: 'Gagal mengubah kata sandi. Pastikan kata sandi lama benar.',
      })
    } finally {
      setSavingPassword(false)
    }
  }, [newPassword, confirmPassword])

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Settings] signOut error:', e)
      captureError(e, { context: 'Settings.handleSignOut' })
    }
  }, [signOut])

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
        {/* Sidebar */}
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

        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* ─── Account Tab ─── */}
          {activeTab === 'account' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informasi Akun</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Perbarui informasi dasar akun Anda.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
                    <OptimizedImage
                      src={
                        profile?.avatar_url ??
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'default'}`
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Ubah Foto
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={displayEmail}
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Peran Akun
                    </label>
                    <input
                      type="text"
                      value={ROLE_LABELS[role] ?? role}
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {profileMessage && (
                  <div
                    className={cn(
                      'text-sm px-4 py-2 rounded-xl',
                      profileMessage.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    )}
                  >
                    {profileMessage.text}
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Notifications Tab ─── */}
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

          {/* ─── Security Tab ─── */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Keamanan Akun</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Kelola kata sandi dan keamanan akun Anda.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi Saat Ini
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata sandi saat ini"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-10"
                    />
                    <button
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi Baru
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {passwordMessage && (
                  <div
                    className={cn(
                      'text-sm px-4 py-2 rounded-xl',
                      passwordMessage.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    )}
                  >
                    {passwordMessage.text}
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleChangePassword}
                    disabled={savingPassword || !newPassword}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {savingPassword ? 'Menyimpan...' : 'Ubah Kata Sandi'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Appearance Tab ─── */}
          {activeTab === 'appearance' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tampilan</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Sesuaikan tema aplikasi.
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light' as Theme, label: 'Terang', Icon: Sun },
                    { id: 'dark' as Theme, label: 'Gelap', Icon: Moon },
                    { id: 'system' as Theme, label: 'Sistem', Icon: Monitor },
                  ].map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      className={cn(
                        'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                        theme === id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-8 h-8',
                          theme === id ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-bold',
                          theme === id
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Language Tab ─── */}
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

          {/* ─── Danger Zone (always visible) ─── */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                Zona Berbahaya
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Tindakan di bawah ini tidak dapat dibatalkan.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleSignOut}
                  className="flex-1 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Toggle Row Component ────────────────────────────────────────────────
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  )
}
