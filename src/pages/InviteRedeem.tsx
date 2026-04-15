import { CheckCircle, Loader2, Mail, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { authService } from '@/features/auth/api/authService'
import { usePageTitle } from '@/hooks/usePageTitle'
import { captureError } from '@/utils/sentry'

export function InviteRedeem() {
  usePageTitle('Validasi Undangan')
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')

  useEffect(() => {
    if (!token) {
      void navigate('/login')
      return
    }

    const validateAndRedeem = async () => {
      try {
        const data = await authService.validateInvitation(token)

        if (!data) {
          setStatus('invalid')
          return
        }

        if (!data.valid && data.error?.toLowerCase().includes('kadaluarsa')) {
          setStatus('expired')
          return
        }

        if (data.valid) {
          setStatus('valid')
          setTimeout(() => {
            void navigate(`/login?invite=${token}`, { replace: true })
          }, 1500)
          return
        }

        setStatus('invalid')
      } catch (err) {
        captureError(err, { context: 'invite-redeem', token: token.slice(0, 8) })
        setStatus('invalid')
      }
    }

    void validateAndRedeem()
  }, [token, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="mx-auto max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              Memvalidasi undangan...
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Mohon tunggu sebentar.</p>
          </>
        )}

        {status === 'valid' && (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              Undangan Valid!
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Mengarahkan ke halaman pengaturan password...
            </p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              Undangan Tidak Valid
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Link undangan tidak valid atau sudah digunakan.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Kembali ke Login
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <Mail className="mx-auto h-16 w-16 text-amber-500" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              Undangan Kedaluwarsa
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Link undangan sudah expired. Silakan minta undangan baru.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Kembali ke Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
