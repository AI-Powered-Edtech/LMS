import { Bell, Download, Plus } from "lucide-react";

interface FinanceExportPanelProps {
  invoicesCount: number;
  unpaidCount: number;
  onAddInvoice: () => void;
  onExport: () => void;
  onReminder: () => void;
}

export function FinanceExportPanel({
  invoicesCount,
  unpaidCount,
  onAddInvoice,
  onExport,
  onReminder,
}: FinanceExportPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">
          Aksi Cepat
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onAddInvoice}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group"
        >
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
              Tambah Tagihan
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Input tagihan manual
            </p>
          </div>
        </button>

        <button
          onClick={onExport}
          disabled={invoicesCount === 0}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors shrink-0">
            <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
              Ekspor CSV
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unduh laporan keuangan
            </p>
          </div>
        </button>

        <button
          onClick={onReminder}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group"
        >
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors shrink-0">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
              Kirim Pengingat
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unpaidCount > 0
                ? `${unpaidCount} siswa belum bayar`
                : "Notifikasi pembayaran"}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
