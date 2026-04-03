import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/hooks/useToast'

import type { MFAFactor } from '../api/mfaService'
import { listMFAFactors, unenrollMFA } from '../api/mfaService'

export function MFASettings() {
  const { addToast } = useToast()
  const [factors, setFactors] = useState<MFAFactor[]>([])

  const loadFactors = useCallback(async () => {
    const result = await listMFAFactors()
    setFactors(result)
  }, [])

  useEffect(() => {
    loadFactors()
  }, [loadFactors])

  const handleDisable = useCallback(async () => {
    const totpFactor = factors.find((f) => f.factor_type === 'totp')
    if (!totpFactor) return

    const success = await unenrollMFA(totpFactor.id)
    if (success) {
      addToast({ type: 'success', message: '2FA berhasil dinonaktifkan' })
      loadFactors()
    } else {
      addToast({ type: 'error', message: 'Gagal menonaktifkan 2FA' })
    }
  }, [factors, addToast, loadFactors])

  const isMFAEnabled = factors.some((f) => f.status === 'verified')

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Verifikasi 2 Langkah</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isMFAEnabled ? '2FA aktif — akun Anda lebih aman' : '2FA belum diaktifkan'}
          </p>
        </div>
        <Badge variant={isMFAEnabled ? 'success' : 'warning'}>
          {isMFAEnabled ? 'Aktif' : 'Nonaktif'}
        </Badge>
      </div>

      {isMFAEnabled && (
        <Button variant="secondary" onClick={handleDisable}>
          Nonaktifkan 2FA
        </Button>
      )}

      {!isMFAEnabled && (
        <a href="#/setup-2fa">
          <Button>Aktifkan 2FA</Button>
        </a>
      )}
    </Card>
  )
}
