/**
 * Settings page tab content components.
 * Extracted to keep Settings.tsx under the max-lines limit.
 */
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Camera, Eye, EyeOff, Lock, Monitor, Moon, Save, Sun } from 'lucide-react'
import { useCallback, useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'

import { OptimizedImage } from '@/src/components/ui'
import { OfflineFormNotice } from '@/src/components/ui/OfflineFormNotice'
import { useAuth } from '@/src/contexts/AuthContext'
import type { Theme } from '@/src/contexts/ThemeContext'
import { api, apiFetch } from '@/src/lib/api'
import { type ProfileFormData, ProfileFormSchema } from '@/src/shared/schemas/forms'
import { cn } from '@/src/utils/cn'

// ── Toggle Row ────────────────────────────────────────────────────────────────
export function ToggleRow({
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
        type="button"
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

// ── Account Tab ───────────────────────────────────────────────────────────────
interface AccountTabProps {
  avatarUrl: string | null | undefined
  displayEmail: string
  roleLabel: string
  displayName: string
}

export function AccountTab({ avatarUrl, displayEmail, roleLabel, displayName }: AccountTabProps) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: valibotResolver(ProfileFormSchema) as unknown as Resolver<ProfileFormData>,
    defaultValues: { fullName: displayName },
  })

  const onSaveProfile = async (data: ProfileFormData) => {
    setSavingProfile(true)
    setProfileMessage(null)
    try {
      const [firstName, ...rest] = data.fullName.trim().split(' ')
      const lastName = rest.join(' ')
      const { error } = await apiFetch('/profiles')
      if (error) throw error
      setProfileMessage({ type: 'success', text: 'Profil berhasil diperbarui.' })
    } catch {
      setProfileMessage({ type: 'error', text: 'Gagal memperbarui profil. Coba lagi.' })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informasi Akun</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Perbarui informasi dasar akun Anda.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSaveProfile)} noValidate className="p-6 space-y-4">
        <OfflineFormNotice />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
            <OptimizedImage
              src={
                avatarUrl ??
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId ?? 'default'}`
              }
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Ubah Foto
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="settings-fullname"
              className="text-sm font-bold text-slate-700 dark:text-slate-300"
            >
              Nama Lengkap
            </label>
            <input
              id="settings-fullname"
              type="text"
              {...register('fullName')}
              aria-invalid={!!profileErrors.fullName}
              aria-describedby={profileErrors.fullName ? 'settings-fullname-error' : undefined}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 aria-[invalid=true]:border-red-400"
            />
            {profileErrors.fullName && (
              <p id="settings-fullname-error" className="text-xs text-red-500 mt-1">
                {profileErrors.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</label>
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
              value={roleLabel}
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
            type="submit"
            disabled={savingProfile}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Security Tab ──────────────────────────────────────────────────────────────
export function SecurityTab() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleChangePassword = useCallback(async () => {
    setPasswordMessage(null)
    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Masukkan kata sandi saat ini.' })
      return
    }
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
      // 1. Verifikasi kata sandi lama dulu
      const { error: authError } = await api.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })
      if (authError) {
        setPasswordMessage({ type: 'error', text: 'Kata sandi saat ini tidak sesuai.' })
        setSavingPassword(false)
        return
      }
      // 2. Baru update password
      const { error } = await api.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordMessage({ type: 'success', text: 'Kata sandi berhasil diubah.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordMessage({
        type: 'error',
        text: 'Gagal mengubah kata sandi. Coba lagi.',
      })
    } finally {
      setSavingPassword(false)
    }
  }, [currentPassword, newPassword, confirmPassword, user])

  return (
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
              type="button"
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
            type="button"
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
  )
}

// ── Appearance Tab ────────────────────────────────────────────────────────────
export function AppearanceTab({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tampilan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sesuaikan tema aplikasi.</p>
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
              type="button"
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
  )
}
