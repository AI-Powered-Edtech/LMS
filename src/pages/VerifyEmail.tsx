import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { authService } from '@/features/auth/api/authService'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/services/supabase/client'
import { addBreadcrumb, captureError } from '@/utils/sentry'

import { useAuth } from '../contexts/AuthContext'

export function VerifyEmail() {
  usePageTitle('Verifikasi Email')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signOut } = useAuth()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (!code && !(tokenHash && type === 'signup')) {
      return
    }

    let active = true
    setVerifying(true)
    setError('')

    void (async () => {
      try {
        addBreadcrumb('Email verification started', 'auth')
        if (code) {
          await supabase.auth.exchangeCodeForSession(window.location.href)
        } else if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup',
          })
          if (verifyError) throw verifyError
        }

        if (!active) return
        setVerified(true)
        const bootstrap = await authService.getAuthBootstrap()
        const destination = authService.resolvePostAuthDestination(bootstrap)
        addBreadcrumb('Email verification redirect resolved', 'auth', { destination })
        setTimeout(() => {
          void navigate(destination, { replace: true })
        }, 1500)
      } catch (err) {
        captureError(err, { context: 'VerifyEmail.confirmation' })
        if (!active) return
        setError(
          err instanceof Error ? err.message : 'Link verifikasi tidak valid atau sudah kedaluwarsa.'
        )
      } finally {
        if (active) {
          setVerifying(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [navigate, searchParams])

  const handleResend = async () => {
    setError('')
    setResending(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email ?? '',
      })

      if (resendError) {
        setError(resendError.message)
      } else {
        setResent(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim ulang email verifikasi.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 w-full max-w-[420px] shadow-2xl border border-slate-200 dark:border-slate-700/50">
        <div className="text-center mb-8">
          <span className="text-5xl inline-block mb-4">📧</span>
          <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold mt-2 mb-1">
            {verified
              ? 'Email Terverifikasi'
              : verifying
                ? 'Memverifikasi Email'
                : 'Verifikasi Email'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed m-0">
            {verified
              ? 'Email Anda sudah berhasil diverifikasi.'
              : verifying
                ? 'Sedang memproses link verifikasi Anda.'
                : 'Kami telah mengirim email verifikasi ke'}
          </p>
          {!verified && !verifying && (
            <p className="text-slate-900 dark:text-slate-100 font-bold text-lg mt-2 mb-6">
              {user?.email ?? 'your@email.com'}
            </p>
          )}
        </div>

        {!verified && !verifying && (
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 flex flex-col gap-3 text-left">
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                1
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium m-0">
                Buka inbox email kamu
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium m-0">
                Klik link "Confirm your mail"
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                3
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium m-0">
                Kembali ke halaman ini dan refresh
              </p>
            </div>
          </div>
        )}

        {error && <div className="text-red-500 text-xs font-bold mt-1">{error}</div>}

        {verified ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm font-bold text-center mb-4 border border-emerald-200 dark:border-emerald-800/50">
            ✅ Verifikasi berhasil. Mengarahkan ke aplikasi...
          </div>
        ) : resent ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm font-bold text-center mb-4 border border-emerald-200 dark:border-emerald-800/50">
            ✅ Email verifikasi telah dikirim ulang!
          </div>
        ) : (
          <button
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full text-sm mb-6"
            onClick={handleResend}
            disabled={resending || verifying}
          >
            {resending ? 'Mengirim...' : '📤 Kirim Ulang Email Verifikasi'}
          </button>
        )}

        {!verified && (
          <div className="flex flex-col gap-3">
            <button
              className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              onClick={() => window.location.reload()}
              disabled={verifying}
            >
              🔄 Refresh Halaman
            </button>

            <button
              className="w-full p-3 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              onClick={signOut}
            >
              Logout & Gunakan Email Lain
            </button>
          </div>
        )}

        <p className="text-center mb-6">Cek folder spam jika tidak menemukan email.</p>
      </div>
    </div>
  )
}
