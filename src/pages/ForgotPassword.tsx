import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { FormField } from '@/components/ui/FormField'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getAuthProvider } from '@/services/auth'
import {
  type ForgotPasswordFormData,
  ForgotPasswordFormSchema,
} from '@/shared/schemas/forms'
import { passwordResetRateLimiter } from '@/utils/rateLimiter'

export function ForgotPassword() {
  const { t } = useTranslation()
  usePageTitle(t('auth.pages.forgotPageTitle'))
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: valibotResolver(ForgotPasswordFormSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError('')

    const { allowed, retryAfterMs } = passwordResetRateLimiter.check('password-reset')
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      setError(t('auth.pages.tooManyAttempts').replace('{seconds}', String(seconds)))
      return
    }

    try {
      const { error: resetError } = await getAuthProvider().resetPasswordForEmail(data.email, {
        emailRedirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSubmitted(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.pages.genericRetryError'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 w-full max-w-[420px] shadow-2xl border border-slate-200 dark:border-slate-700/50">
        <div className="text-center mb-8">
          <span className="text-5xl inline-block mb-4">🔐</span>
          <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-2 mb-1">
            {t('auth.pages.forgotHeading')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">
            {submitted
              ? t('auth.pages.forgotSubmittedHint')
              : t('auth.pages.forgotHint')}
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-center">
            <p className="text-4xl mb-4">✉️</p>
            <p className="text-emerald-700 dark:text-emerald-400 font-bold mb-2">
              {t('auth.pages.resetEmailSent')} <strong>{getValues('email')}</strong>. {t('auth.pages.checkInboxSpam')}
            </p>
            <p className="text-emerald-600/80 dark:text-emerald-500/80 text-xs">
              {t('auth.pages.linkExpires')}
            </p>
            <Link
              to="/login"
              className="text-blue-600 dark:text-blue-400 text-sm font-bold no-underline block text-center mt-4 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {t('auth.pages.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField control={control} name="email" label={t('common.email')}>
              <input
                type="email"
                className="p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                {...register('email')}
                placeholder={t('auth.loginForm.emailPlaceholder')}
                autoFocus
              />
            </FormField>

            {error && <div className="text-red-500 text-xs font-bold mt-1">{error}</div>}

            <button
              type="submit"
              className="mt-2 p-3 bg-blue-600 text-white font-bold rounded-lg border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('auth.pages.sending') : t('auth.pages.sendResetLink')}
            </button>

            <Link
              to="/login"
              className="text-blue-600 dark:text-blue-400 text-sm font-bold no-underline block text-center mt-4 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {t('auth.pages.backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
