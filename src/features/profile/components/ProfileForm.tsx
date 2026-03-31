import { CheckCircle, Save, User } from 'lucide-react'
import { useState } from 'react'

import { Button, Card, Input, OptimizedImage } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/features/settings/api/settingsService'
import { cn } from '@/utils/cn'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function ProfileForm() {
  const { user, profile } = useAuth()

  const initialFirst = profile?.first_name ?? ''
  const initialLast = profile?.last_name ?? ''

  const [firstName, setFirstName] = useState(initialFirst)
  const [lastName, setLastName] = useState(initialLast)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const displayName =
    firstName.trim() || lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`.trim()
      : (user?.user_metadata?.full_name ?? 'Pengguna')

  const avatarUrl =
    profile?.avatar_url ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'default'}`

  const isDirty = firstName !== initialFirst || lastName !== initialLast

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!firstName.trim()) {
      setErrorMsg('Nama depan tidak boleh kosong.')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      await settingsService.updateProfile(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.')
    }
  }

  return (
    <Card padding="lg" className="rounded-3xl dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
          <User className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Informasi Profil</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perbarui nama tampilan Anda
          </p>
        </div>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl">
        <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-700 p-1 shadow ring-2 ring-slate-200 dark:ring-slate-600 shrink-0">
          <OptimizedImage
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full rounded-full object-cover bg-slate-100 dark:bg-slate-600"
          />
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{displayName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.email ?? ''}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
            Avatar dibuat otomatis berdasarkan akun Anda
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nama Depan"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Masukkan nama depan"
            disabled={status === 'loading'}
            required
          />
          <Input
            label="Nama Belakang"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Masukkan nama belakang"
            disabled={status === 'loading'}
          />
        </div>

        <Input
          label="Email"
          value={user?.email ?? ''}
          disabled
          readOnly
          className="opacity-60 cursor-not-allowed"
        />

        {/* Feedback */}
        {status === 'error' && errorMsg && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
            {errorMsg}
          </p>
        )}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Perubahan berhasil disimpan.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={status === 'loading'}
            disabled={!isDirty || status === 'loading'}
            icon={<Save className="w-4 h-4" />}
            className={cn(!isDirty && 'opacity-50')}
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Card>
  )
}
