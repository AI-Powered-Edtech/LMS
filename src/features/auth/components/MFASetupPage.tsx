import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/hooks/useToast'

import { startMFAEnrollment, verifyMFAEnrollment } from '../api/mfaService'

export function MFASetupPage() {
  const { addToast } = useToast()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartEnrollment = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await startMFAEnrollment()
    if (result) {
      setQrCodeUrl(result.qrCodeUrl)
      setSecret(result.secret)
      setFactorId(result.factorId)
    } else {
      setError('Gagal memulai pendaftaran 2FA. Coba lagi.')
      addToast({ type: 'error', message: 'Gagal memulai pendaftaran 2FA' })
    }
    setLoading(false)
  }, [addToast])

  const handleVerify = useCallback(async () => {
    if (!factorId || verificationCode.length !== 6) return
    setVerifying(true)
    setError(null)
    const result = await verifyMFAEnrollment(factorId, verificationCode)
    if (result) {
      addToast({ type: 'success', message: '2FA berhasil diaktifkan!' })
      window.location.assign('/app/student/dashboard')
    } else {
      setError('Kode verifikasi salah. Pastikan waktu perangkat Anda akurat.')
      addToast({ type: 'error', message: 'Kode verifikasi salah' })
    }
    setVerifying(false)
  }, [factorId, verificationCode, addToast])

  useEffect(() => {
    void handleStartEnrollment()
  }, [handleStartEnrollment])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Aktifkan Verifikasi 2 Langkah
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Scan QR code dengan aplikasi authenticator (Google Authenticator, Authy, dll.)
          </p>
        </div>

        {loading && (
          <div className="flex justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {qrCodeUrl && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code untuk setup 2FA"
                className="w-48 h-48 rounded-lg border-2 border-slate-200 dark:border-slate-700"
                loading="lazy"
                decoding="async"
              />
            </div>

            {secret && (
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Atau masukkan kode ini secara manual:
                </p>
                <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded select-all">
                  {secret}
                </code>
              </div>
            )}

            <div className="space-y-2">
              <Input
                label="Kode Verifikasi (6 digit)"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                aria-label="Masukkan kode 6 digit dari authenticator app"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <Button
              onClick={handleVerify}
              disabled={verifying || verificationCode.length !== 6}
              fullWidth
            >
              {verifying ? 'Memverifikasi...' : 'Verifikasi & Aktifkan'}
            </Button>
          </div>
        )}

        <div className="text-center">
          <a
            href="/app/student/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Lewati untuk sekarang
          </a>
        </div>
      </Card>
    </div>
  )
}
