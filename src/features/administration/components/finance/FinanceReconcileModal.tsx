import { Bell, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'

import { type ReminderResult, sendInvoiceReminders } from '../../api/financeApi'

interface FinanceReconcileModalProps {
  invoiceIds: string[]
  unpaidCount: number
  onClose: () => void
  onComplete?: () => void
}

export function FinanceReconcileModal({
  invoiceIds,
  unpaidCount,
  onClose,
  onComplete,
}: FinanceReconcileModalProps) {
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<ReminderResult[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  async function handleSend() {
    if (!tenantId) {
      addToast({ type: 'error', message: 'Tenant tidak ditemukan.' })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await sendInvoiceReminders(tenantId, invoiceIds)
      setResults(response)
      setHasSubmitted(true)
      onComplete?.()

      const failed = response.filter((item) => item.reminderStatus === 'failed').length
      if (failed > 0) {
        addToast({
          type: 'warning',
          message: `Pengingat diproses dengan ${failed} kegagalan.`,
        })
      } else {
        addToast({
          type: 'success',
          message: 'Pengingat pembayaran berhasil diproses.',
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal mengirim pengingat.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Kirim Pengingat Pembayaran
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sistem akan membuat notifikasi internal dan log audit untuk setiap tagihan yang
              diproses.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 mb-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {invoiceIds.length > 0 ? (
              <>
                Target pengingat:{' '}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {invoiceIds.length}
                </span>{' '}
                tagihan terpilih.
              </>
            ) : (
              <>
                Pengingat akan diproses untuk seluruh tagihan belum lunas di tenant ini. Halaman ini
                saat ini menampilkan{' '}
                <span className="font-bold text-slate-900 dark:text-slate-100">{unpaidCount}</span>{' '}
                tagihan belum lunas.
              </>
            )}
          </p>
        </div>

        {hasSubmitted && results.length > 0 && (
          <div className="mb-5 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Status per Tagihan
              </p>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400">
                      Siswa
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400">
                      Email
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400">
                      Pesan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const isSuccess = result.reminderStatus !== 'failed'
                    return (
                      <tr
                        key={result.invoiceId}
                        className="border-b border-slate-100 dark:border-slate-800 align-top"
                      >
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                          {result.studentName ?? 'Tanpa nama'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {result.studentEmail ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              isSuccess
                                ? 'inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400'
                                : 'inline-flex items-center gap-1 text-red-600 dark:text-red-400'
                            }
                          >
                            {isSuccess ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {isSuccess ? 'Berhasil' : 'Gagal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {result.reminderMessage}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {hasSubmitted ? 'Tutup' : 'Batal'}
          </button>
          <button
            onClick={handleSend}
            disabled={isSubmitting || unpaidCount === 0}
            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {hasSubmitted ? 'Kirim Ulang Pengingat' : 'Kirim Pengingat'}
          </button>
        </div>
      </div>
    </div>
  )
}
