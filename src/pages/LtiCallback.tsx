import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { supabase } from '@/services/supabase/client'

// ==========================================================================
// LtiCallback — Handles the redirect after LTI launch
//
// Receives a magic link token from the lti-launch Edge Function,
// verifies it via Supabase OTP, and redirects to the target lesson/course.
//
// Route: /#/lti/callback?token=...&type=magiclink&redirect=...
// ==========================================================================

type CallbackState = 'verifying' | 'success' | 'error'

export function LtiCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState<CallbackState>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function verifyToken() {
      const token = searchParams.get('token')
      const type = searchParams.get('type') || 'magiclink'
      const redirect = searchParams.get('redirect') || '/app/student/courses'

      if (!token) {
        setState('error')
        setErrorMessage(
          'Token autentikasi tidak ditemukan. Silakan coba lagi dari platform LMS Anda.'
        )
        return
      }

      try {
        // Verify the OTP token to establish a Supabase session
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as 'magiclink',
        })

        if (error) {
          console.error('[LtiCallback] OTP verification failed:', error)
          setState('error')

          if (error.message?.includes('expired')) {
            setErrorMessage('Link sudah kadaluarsa. Silakan coba lagi dari platform LMS Anda.')
          } else if (error.message?.includes('invalid')) {
            setErrorMessage('Token tidak valid. Silakan coba lagi dari platform LMS Anda.')
          } else {
            setErrorMessage(`Gagal memverifikasi sesi: ${error.message}`)
          }
          return
        }

        if (!data.session) {
          setState('error')
          setErrorMessage('Sesi tidak dapat dibuat. Silakan coba lagi.')
          return
        }

        setState('success')

        // Short delay to show success state, then redirect
        setTimeout(() => {
          // Navigate to the target page
          // The redirect path from LTI launch may be a full URL or a relative path
          try {
            const url = new URL(redirect, window.location.origin)
            // If it's an internal path, use navigate
            if (url.origin === window.location.origin) {
              const path = url.pathname + url.search + url.hash
              void navigate(path, { replace: true })
            } else {
              // External redirect (shouldn't happen, but handle gracefully)
              void navigate('/app/student/courses', { replace: true })
            }
          } catch (err) {
            if (import.meta.env.DEV)
              console.warn(
                '[LtiCallback] Redirect URL parse failed, falling back to courses:',
                redirect,
                err
              )
            void navigate('/app/student/courses', { replace: true })
          }
        }, 500)
      } catch (err) {
        console.error('[LtiCallback] Unexpected error:', err)
        setState('error')
        setErrorMessage('Terjadi kesalahan yang tidak terduga. Silakan coba lagi.')
      }
    }

    void verifyToken()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 text-center">
          {/* Logo / Header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">EduSync LTI</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Integrasi Platform Pembelajaran
            </p>
          </div>

          {state === 'verifying' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Memverifikasi sesi Anda...
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Berhasil! Mengalihkan ke materi...
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">Verifikasi Gagal</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{errorMessage}</p>
              </div>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="mt-2 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                           bg-slate-100 text-slate-700 hover:bg-slate-200
                           dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700
                           transition-colors"
              >
                Ke Halaman Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
