import { Bell } from 'lucide-react'

interface FinanceReconcileModalProps {
  unpaidCount: number
  onClose: () => void
}

export function FinanceReconcileModal({ unpaidCount, onClose }: FinanceReconcileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Kirim Pengingat</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Akan mengirim notifikasi pengingat pembayaran ke{' '}
          <span className="font-bold text-slate-900 dark:text-slate-100">{unpaidCount} siswa</span>{' '}
          yang belum melunasi tagihan. Fitur pengiriman otomatis memerlukan konfigurasi email di
          Supabase Edge Functions.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
          >
            Kirim Pengingat
          </button>
        </div>
      </div>
    </div>
  )
}
