import { valibotResolver } from '@hookform/resolvers/valibot'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { FormField } from '@/components/ui/FormField'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getAuthProvider } from '@/services/auth'
import {
  type ResetPasswordFormData,
  ResetPasswordFormSchema,
} from '@/shared/schemas/forms'

export function ResetPassword() {
  const { t } = useTranslation()
  usePageTitle(t('auth.pages.resetPageTitle'))
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  // FIXED: useRef tracks recovery state inside the auth listener to avoid stale closure.
  // Reading `sessionReady` state inside a useEffect with [] deps always sees the initial
  // value (false), so a subsequent SIGNED_IN event would incorrectly redirect to home.
  const isRecoveryRef = useRef(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: valibotResolver(ResetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)

    const prepareRecoverySession = async () => {
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      try {
        if (code) {
          const { error } = await getAuthProvider().exchangeCodeForSession(code)
          if (error) throw error
          isRecoveryRef.current = true
          setSessionReady(true)
          return
        }

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await getAuthProvider().verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })

          if (verifyError) {
            throw verifyError
          }

          isRecoveryRef.current = true
          setSessionReady(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth.pages.invalidResetLink'))
      }
    }

    void prepareRecoverySession()

    // Auth provider may auto-login the user when they click the recovery link.
    // Only set sessionReady=true for PASSWORD_RECOVERY events.
    // A regular SIGNED_IN session (normal login) should not unlock the reset form —
    // that would allow any authenticated user to reach the reset page and change their
    // password without going through the email recovery flow.
    const {
      data: { subscription },
    } = getAuthProvider().onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Only PASSWORD_RECOVERY events unlock the password reset form.
        // Use the ref to prevent a subsequent SIGNED_IN event (e.g. after updateUser)
        // from incorrectly redirecting when we ARE in recovery mode.
        isRecoveryRef.current = true
        setSessionReady(true)
      } else if (event === 'SIGNED_IN' && !isRecoveryRef.current) {
        // Regular sign-in (not recovery) — redirect to home.
        void navigate('/')
      }
    })

    // On page refresh after PASSWORD_RECOVERY, the session type may not re-fire.
    // We do NOT auto-set sessionReady from getSession() alone because we cannot
    // distinguish a recovery session from a regular session without the auth event.
    // The user must re-click the email link if they refresh the page.

    return () => subscription.unsubscribe()
  }, [navigate])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError('')

    try {
      const { error: updateError } = await getAuthProvider().updateUser({
        password: data.password,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/'), 3000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.pages.genericErrorShort'))
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 w-full max-w-[420px] shadow-2xl border border-slate-200 dark:border-slate-700/50">
          <div className="text-center mb-8">
            <span className="text-5xl inline-block mb-4">⏳</span>
            <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-2 mb-1">
              {t('auth.pages.verifying')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">
              {t('auth.pages.waitingVerification')}
            </p>
          </div>
          <div className="text-center mb-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm m-0">
              {t('auth.pages.expiredHint')}
            </p>
            <Link
              to="/forgot-password"
              className="text-blue-600 dark:text-blue-400 text-sm font-bold no-underline block text-center mt-4 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {t('auth.pages.requestNewLink')}
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
            {success ? t('auth.pages.passwordChangedTitle') : t('auth.pages.newPasswordTitle')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">
            {success
              ? t('auth.pages.redirectingDashboard')
              : t('auth.pages.enterNewPassword')}
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-center">
            <p className="text-emerald-700 dark:text-emerald-400 font-bold mb-2">
              {t('auth.pages.passwordUpdatedRedirect')}
            </p>
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 text-sm font-bold no-underline block text-center mt-4 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {t('auth.pages.toDashboard')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div style={{ position: 'relative' }}>
              <FormField control={control} name="password" label={t('auth.pages.newPassword')}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="p-3 pr-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  {...register('password')}
                  placeholder={t('auth.pages.newPasswordPlaceholder')}
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
                aria-label={showPassword ? t('auth.pages.hidePassword') : t('auth.pages.showPassword')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <FormField control={control} name="confirmPassword" label={t('auth.pages.confirmPassword')}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="p-3 pr-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  {...register('confirmPassword')}
                  placeholder={t('auth.pages.confirmPasswordPlaceholder')}
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
                aria-label={showPassword ? t('auth.pages.hidePassword') : t('auth.pages.showPassword')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <div className="text-red-500 text-xs font-bold mt-1">{error}</div>}

            <button
              type="submit"
              className="mt-2 p-3 bg-blue-600 text-white font-bold rounded-lg border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('auth.pages.saving') : t('auth.pages.saveNewPassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
