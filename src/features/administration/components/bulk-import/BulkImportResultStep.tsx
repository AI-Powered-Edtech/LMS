import { CheckCircle2, Download, XCircle } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { BulkImportRow } from '../../api/bulkImportService'

interface ImportResultRow extends BulkImportRow {
  _rowIndex: number
  status: 'berhasil' | 'gagal'
  reason?: string
}

interface BulkImportResultStepProps {
  successCount: number
  failedCount: number
  importResults: ImportResultRow[]
  onDownloadReport: () => void
  onRetry: () => void
  onClose: () => void
}

export function BulkImportResultStep({
  successCount,
  failedCount,
  importResults,
  onDownloadReport,
  onRetry,
  onClose,
}: BulkImportResultStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-emerald-600">{successCount}</p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">Berhasil Diimpor</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-red-600">{failedCount}</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">Gagal</p>
        </div>
      </div>

      {importResults.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Detail Hasil Import
            </p>
          </div>
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Email', 'Nama', 'Peran', 'Status', 'Keterangan'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importResults.map((r, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-slate-100 dark:border-slate-800',
                      r.status === 'gagal' && 'bg-red-50/50 dark:bg-red-900/10'
                    )}
                  >
                    <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-300">
                      {r.email}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                      {r.full_name}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{r.role}</td>
                    <td className="px-3 py-1.5">
                      {r.status === 'berhasil' ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Berhasil
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-3 h-3" /> Gagal
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 italic">
                      {r.reason ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onDownloadReport}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Unduh Laporan
        </button>
        {failedCount > 0 && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            Impor Ulang
          </button>
        )}
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-all"
        >
          Selesai
        </button>
      </div>
    </div>
  )
}
