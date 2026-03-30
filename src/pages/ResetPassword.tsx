import { valibotResolver } from '@hookform/resolvers/valibot'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import * as v from 'valibot'

import { FormField } from '@/src/components/ui/FormField'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { supabase } from '@/src/services/supabase/client'

const resetPasswordSchema = v.pipe(
  v.object({
    password: v.pipe(v.string(), v.minLength(6, 'Password minimal 6 karakter.')),
    confirmPassword: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (input) => input.password === input.confirmPassword,
      'Password tidak cocok.'
    ),
    ['confirmPassword']
  )
)

type ResetPasswordFormData = v.InferInput<typeof resetPasswordSchema>

export function ResetPassword() {
  usePageTitle('Atur Ulang Kata Sandi')
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: valibotResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Supabase auto-logs the user in when they click the recovery link.
    // We listen for the PASSWORD_RECOVERY event to know we're ready.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if user already has an active session (e.g., page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/'), 3000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 w-full max-w-[420px] shadow-2xl border border-slate-200 dark:border-slate-700/50">
          <div className="text-center mb-8">
            <span className="text-5xl inline-block mb-4">⏳</span>
            <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-2 mb-1">Memverifikasi...</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">Menunggu verifikasi link reset password.</p>
          </div>
          <div className="text-center mb-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm m-0">
              Jika halaman ini tidak berubah, link mungkin sudah kedaluwarsa.
            </p>
            <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 text-sm font-bold no-underline block text-center mt-4 hover:text-blue-700 dark:hover:text-blue-300">
              Minta link baru →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 w-full max-w-[420px] shadow-2xl border border-slate-200 dark:border-slate-700/50">
        <div className="text-center mb-8">
          <span className="text-5xl inline-block mb-4">{success ? '✅' : '🔑'}</span>
          <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-2 mb-1">
            {success ? 'Password Berhasil Diubah' : 'Buat Password Baru'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">
            {success
              ? 'Anda akan dialihkan ke dashboard...'
              : 'Masukkan password baru untuk akun Anda'}
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-center">
            <p className="text-emerald-700 dark:text-emerald-400 font-bold mb-2">
              Password telah diperbarui. Mengarahkan ke dashboard dalam 3 detik...
            </p>
            <Link to="/" className="text-blue-600 dark:text-blue-400 text-sm font-bold no-underline block text-center mt-4 hover:text-blue-700 dark:hover:text-blue-300">
              Ke Dashboard →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div style={{ position: 'relative' }}>
              <FormField control={control} name="password" label="Kata Sandi Baru">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="p-3 pr-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  {...register('password')}
                  placeholder="Minimal 6 karakter"
                  autoFocus
                />
              </FormField>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 40,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <FormField control={control} name="confirmPassword" label="Konfirmasi Kata Sandi">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="p-3 pr-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  {...register('confirmPassword')}
                  placeholder="Ulangi password baru"
                />
              </FormField>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 40,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <div className="text-red-500 text-xs font-bold mt-1">{error}</div>}

            <button type="submit" className="mt-2 p-3 bg-blue-600 text-white font-bold rounded-lg border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}


