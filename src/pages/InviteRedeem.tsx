import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'

import { supabase } from '@/src/services/supabase/client'
import { captureError } from '@/src/utils/sentry'
import { usePageTitle } from '@/src/hooks/usePageTitle'

export function InviteRedeem() {
  usePageTitle('Validasi Undangan')
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const validateAndRedeem = async () => {
      try {
        // Validasi token via RPC
        const { data, error } = await supabase.rpc('validate_invite_token', {
          p_token: token,
        })

        if (error || !data) {
          setStatus('invalid')
          return
        }

        if (data.status === 'expired') {
          setStatus('expired')
          return
        }

        if (data.status === 'valid') {
          setStatus('valid')
          // Simpan invite data di sessionStorage (bukan URL) — mencegah token bocor
          sessionStorage.setItem(
            'invite_data',
            JSON.stringify({
              email: data.email,
              role: data.role,
              tenantId: data.tenant_id,
            })
          )
          setTimeout(() => {
            navigate('/set-password')
          }, 1500)
        }
      } catch (err) {
        captureError(err, { context: 'invite-redeem', token: token.slice(0, 8) })
        setStatus('invalid')
      }
    }

    validateAndRedeem()
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
