import { CheckCircle, KeyRound, Lock } from 'lucide-react'
import { useState } from 'react'

import { Button, Card, Input } from '@/src/components/ui'
import { settingsService } from '@/src/features/settings/api/settingsService'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const validate = (): string | null => {
    if (newPassword.length < 8) return 'Kata sandi minimal 8 karakter.'
    if (newPassword !== confirmPassword) return 'Konfirmasi kata sandi tidak cocok.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setErrorMsg(validationError)
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      await settingsService.changePassword(newPassword)
      setStatus('success')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengubah kata sandi.')
    }
  }

  const isLoading = status === 'loading'

  return (
    <Card padding="lg" className="rounded-3xl dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <KeyRound className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Ubah Kata Sandi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gunakan kata sandi yang kuat dan unik
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Kata Sandi Baru"
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value)
            if (status === 'error') setErrorMsg('')
          }}
          placeholder="Minimal 8 karakter"
          disabled={isLoading}
          icon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
        />

        <Input
          label="Konfirmasi Kata Sandi"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (status === 'error') setErrorMsg('')
          }}
          placeholder="Ulangi kata sandi baru"
          disabled={isLoading}
          icon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
          error={
            confirmPassword && newPassword && confirmPassword !== newPassword
              ? 'Kata sandi tidak cocok'
              : undefined
          }
        />

        {/* Password strength hint */}
        {newPassword.length > 0 && newPassword.length < 8 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Kata sandi terlalu pendek ({newPassword.length}/8 karakter)
          </p>
        )}

        {/* Feedback */}
        {status === 'error' && errorMsg && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
            {errorMsg}
          </p>
        )}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Kata sandi berhasil diubah.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={!newPassword || !confirmPassword || isLoading}
          >
            Ubah Kata Sandi
          </Button>
        </div>
      </form>
    </Card>
  )
}
