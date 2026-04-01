import { Wallet } from 'lucide-react'

import { usePageTitle } from '@/src/hooks/usePageTitle'

export function FinanceDashboard() {
  usePageTitle('Dasbor Keuangan')

  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
        <Wallet className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Keuangan & SPP</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
        Modul keuangan untuk pengelolaan SPP, gaji guru, dan laporan keuangan sekolah sedang dalam
        pengembangan.
      </p>
      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-semibold text-amber-700 dark:text-amber-300">
        Segera Hadir
      </div>
    </div>
  )
}
