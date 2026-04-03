import { useCallback, useState } from 'react'

import { Button, Card } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'

import { requestAccountDeletion } from '../api/privacyService'

export function AccountDeletionPage() {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const [reason, setReason] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!user || !reason.trim() || confirmName !== (profile?.first_name ?? '')) return
    setLoading(true)
    setError(null)

    const success = await requestAccountDeletion(user.id, reason.trim())
    if (success) {
      setSubmitted(true)
      addToast({ type: 'success', message: 'Permintaan penghapusan akun berhasil dikirim' })
    } else {
      setError('Gagal mengirim permintaan. Coba lagi nanti.')
      addToast({ type: 'error', message: 'Gagal mengirim permintaan penghapusan' })
    }
    setLoading(false)
  }, [user, reason, confirmName, profile, addToast])

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <Card className="p-6 text-center space-y-4">
          <div className="text-4xl">📨</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Permintaan Terkirim</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Permintaan penghapusan akun Anda telah dikirim ke admin sekolah. Admin akan meninjau dan
            menghubungi Anda dalam 14 hari kerja.
          </p>
          <a href="#/app/student/dashboard">
            <Button>Kembali ke Dashboard</Button>
          </a>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hapus Akun</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Permintaan penghapusan akun akan dikirim ke admin sekolah untuk ditinjau. Data Anda tidak
          akan dihapus sampai admin menyetujui permintaan ini.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ⚠️ <strong>Perhatian:</strong> Penghapusan akun bersifat permanen. Semua data
            pembelajaran, nilai, dan sertifikat Anda akan dihapus.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Alasan penghapusan
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ceritakan alasan Anda menghapus akun..."
            aria-label="Alasan penghapusan akun"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Konfirmasi: ketik nama depan Anda untuk melanjutkan
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={profile?.first_name ?? 'Nama depan Anda'}
            aria-label="Konfirmasi nama depan untuk penghapusan akun"
          />
        </div>

        {error && (
          <p
            className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || !reason.trim() || confirmName !== (profile?.first_name ?? '')}
          variant="danger"
          fullWidth
        >
          {loading ? 'Mengirim...' : 'Kirim Permintaan Penghapusan'}
        </Button>
      </Card>
    </div>
  )
}
