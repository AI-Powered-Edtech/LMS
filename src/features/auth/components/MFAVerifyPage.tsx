import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/hooks/useToast'

import { listMFAFactors, verifyMFAChallenge } from '../api/mfaService'

export function MFAVerifyPage() {
  const { addToast } = useToast()
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = useCallback(async () => {
    if (verificationCode.length !== 6) return
    setLoading(true)
    setError(null)

    const factors = await listMFAFactors()
    const totpFactor = factors.find((f) => f.factor_type === 'totp' && f.status === 'verified')

    if (!totpFactor) {
      setError('Tidak ada faktor 2FA yang ditemukan. Hubungi admin.')
      addToast({ type: 'error', message: 'Faktor 2FA tidak ditemukan' })
      setLoading(false)
      return
    }

    const success = await verifyMFAChallenge(totpFactor.id, verificationCode)
    if (success) {
      addToast({ type: 'success', message: 'Verifikasi berhasil!' })
      window.location.hash = '#/app/student/dashboard'
    } else {
      setError('Kode verifikasi salah. Pastikan waktu perangkat Anda akurat.')
      addToast({ type: 'error', message: 'Kode verifikasi salah' })
    }
    setLoading(false)
  }, [verificationCode, addToast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Verifikasi 2 Langkah
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Masukkan kode 6 digit dari authenticator app Anda
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label="Kode Verifikasi"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            aria-label="Masukkan kode 6 digit dari authenticator app"
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            onClick={handleVerify}
            disabled={loading || verificationCode.length !== 6}
            fullWidth
          >
            {loading ? <Spinner size="sm" /> : 'Verifikasi'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
