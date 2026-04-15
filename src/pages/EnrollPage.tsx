import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { classroomService } from '@/features/classroom/api/classroomService'
import { usePageTitle } from '@/hooks/usePageTitle'

type EnrollStatus = 'loading' | 'success' | 'already_enrolled' | 'invalid_code' | 'error'

const SESSION_STORAGE_KEY = 'edusync_pending_join_code'

/**
 * EnrollPage — handles deep link enrollment via /#/join?code=XXXXXX
 *
 * Flow:
 * 1. If not logged in: save join code to sessionStorage, redirect to /login
 *    The AuthGuard will pass `state.from` so Login redirects back here after auth.
 * 2. If logged in: call `enroll_student` RPC with the code
 * 3. Show result (success / error) and redirect to student dashboard after 2s
 */
export function EnrollPage() {
  usePageTitle('Bergabung ke Kelas')

  const { session, user, loading: authLoading, role } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState<EnrollStatus>('loading')
  const [message, setMessage] = useState('')
  const hasCalled = useRef(false)

  // Extract join code: from URL params or from sessionStorage (post-login redirect)
  const codeFromUrl = searchParams.get('code')?.toUpperCase() ?? ''
  const codeFromSession = sessionStorage.getItem(SESSION_STORAGE_KEY) ?? ''
  const joinCode = codeFromUrl || codeFromSession

  useEffect(() => {
    // Wait for auth to resolve
    if (authLoading) return

    // No join code at all
    if (!joinCode) {
      setStatus('invalid_code')
      setMessage('Kode kelas tidak ditemukan di URL. Minta link yang valid kepada guru kamu.')
      return
    }

    // Not logged in: persist code to session and redirect to login
    if (!session || !user) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, joinCode)
      void navigate('/login', {
        state: { from: { pathname: `/join`, search: `?code=${joinCode}` } },
        replace: true,
      })
      return
    }

    // Only students can enroll
    if (role && role !== 'student') {
      setStatus('error')
      setMessage('Hanya siswa yang dapat bergabung ke kelas melalui link ini.')
      return
    }

    // Prevent double-call (React StrictMode)
    if (hasCalled.current) return
    hasCalled.current = true

    // Clear session storage now that we have the code
    sessionStorage.removeItem(SESSION_STORAGE_KEY)

    // Perform enrollment
    classroomService
      .joinClassroom(joinCode)
      .then(() => {
        setStatus('success')
        setMessage('Berhasil bergabung ke kelas!')
        setTimeout(() => {
          void navigate('/app/student/dashboard', { replace: true })
        }, 2000)
      })
      .catch((err: Error) => {
        const msg = err.message || ''
        if (msg.includes('sudah terdaftar')) {
          setStatus('already_enrolled')
          setMessage('Kamu sudah terdaftar di kelas ini.')
        } else if (msg.includes('tidak ditemukan') || msg.includes('tidak valid')) {
          setStatus('invalid_code')
          setMessage('Kode kelas tidak valid atau sudah kedaluwarsa.')
        } else {
          setStatus('error')
          setMessage(msg || 'Gagal bergabung ke kelas. Silakan coba lagi.')
        }
        // Redirect to dashboard after 3s even on error
        setTimeout(() => {
          void navigate('/app/student/dashboard', { replace: true })
        }, 3000)
      })
  }, [authLoading, session, user, joinCode, role, navigate])

  const isLoading = status === 'loading' || authLoading

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-8 text-center">
        {/* Logo / App name */}
        <div className="mb-6">
          <div className="text-4xl mb-2">📚</div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-wider">
            EduSync LMS
          </p>
        </div>

        {isLoading && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Sedang bergabung ke kelas...
            </h1>
            {joinCode && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Kode:{' '}
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 tracking-widest">
                  {joinCode}
                </span>
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Berhasil!
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{message}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Mengalihkan ke dasbor...
            </p>
          </>
        )}

        {status === 'already_enrolled' && (
          <>
            <CheckCircle className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Sudah Terdaftar
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{message}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Mengalihkan ke dasbor...
            </p>
          </>
        )}

        {(status === 'invalid_code' || status === 'error') && (
          <>
            <XCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Gagal Bergabung
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">{message}</p>
            <button
              onClick={() => navigate('/app/student/dashboard', { replace: true })}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Ke Dasbor
            </button>
          </>
        )}
      </div>
    </div>
  )
}
