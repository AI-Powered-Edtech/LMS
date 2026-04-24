import { AlertCircle, CheckCircle2, Clock, FileText, Search } from 'lucide-react'

import { formatCurrency as formatRupiah } from '@/shared/utils/format-id'
import { cn } from '@/utils/cn'

import type { InvoiceFilter, InvoiceRecord, InvoiceStatusFilter } from '../../types/finance'

const ID_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function formatMonthYear(monthYear: string | null): string {
  if (!monthYear) return '—'
  const [year, month] = monthYear.split('-')
  const idx = parseInt(month ?? '1', 10) - 1
  return `${ID_MONTHS[idx] ?? month} ${year}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const wibOffset = 7 * 60
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000
  const wib = new Date(utcMs + wibOffset * 60_000)
  return `${String(wib.getDate()).padStart(2, '0')} ${ID_MONTHS[wib.getMonth()]} ${wib.getFullYear()}`
}

interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const s = status.toLowerCase()

  if (s === 'paid' || s === 'lunas') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Lunas
      </span>
    )
  }

  if (s === 'overdue' || s === 'terlambat' || s === 'uncollectible') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle className="w-3 h-3" />
        Terlambat
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <Clock className="w-3 h-3" />
      Belum Bayar
    </span>
  )
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

function EmptyFinance() {
  return (
    <tr>
      <td colSpan={7} className="text-center py-16">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
          <FileText className="w-12 h-12 opacity-40" />
          <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada data tagihan</p>
          <p className="text-sm">Tagihan SPP akan muncul di sini setelah ditambahkan.</p>
        </div>
      </td>
    </tr>
  )
}

const STATUS_OPTIONS: { value: InvoiceStatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'paid', label: 'Lunas' },
  { value: 'pending', label: 'Belum Bayar' },
  { value: 'overdue', label: 'Terlambat' },
]

interface FinanceTransactionTableProps {
  invoices: InvoiceRecord[]
  totalCount: number
  totalPages: number
  filter: InvoiceFilter
  searchInput: string
  isLoading: boolean
  isMarkingPaid: boolean
  onSearch: () => void
  onSearchInputChange: (value: string) => void
  onStatusChange: (status: InvoiceStatusFilter) => void
  onMarkAsPaid: (invoiceId: string, amount: number) => void
  onPageChange: (page: number) => void
}

export function FinanceTransactionTable({
  invoices,
  totalCount,
  totalPages,
  filter,
  searchInput,
  isLoading,
  isMarkingPaid,
  onSearch,
  onSearchInputChange,
  onStatusChange,
  onMarkAsPaid,
  onPageChange,
}: FinanceTransactionTableProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Daftar Tagihan SPP</h2>
          {totalCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full font-medium">
              {totalCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onStatusChange(value)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                filter.status === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <button
            onClick={onSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Cari
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Nama Siswa
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Keterangan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Bulan
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Jumlah
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tgl. Bayar
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
            ) : invoices.length === 0 ? (
              <EmptyFinance />
            ) : (
              invoices.map((inv: InvoiceRecord) => (
                <tr
                  key={inv.id}
                  className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {inv.student_name ?? '—'}
                      </p>
                      {inv.student_email && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                          {inv.student_email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                    {inv.description ?? 'SPP'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatMonthYear(inv.month_year) !== '—'
                      ? formatMonthYear(inv.month_year)
                      : formatDate(inv.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {formatRupiah(inv.amount_due)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                    {inv.paid_at ? formatDate(inv.paid_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onMarkAsPaid(inv.id, inv.amount_due ?? inv.amount_paid ?? 0)}
                      disabled={
                        inv.status === 'paid' ||
                        (inv.status as string).toLowerCase() === 'lunas' ||
                        isMarkingPaid
                      }
                      className="text-xs px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-700 dark:hover:bg-green-600 transition-colors whitespace-nowrap"
                    >
                      {inv.status === 'paid' || (inv.status as string).toLowerCase() === 'lunas'
                        ? 'Lunas ✓'
                        : 'Tandai Lunas'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {filter.page} dari {totalPages} ({totalCount} data)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, filter.page - 1))}
              disabled={filter.page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, filter.page + 1))}
              disabled={filter.page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
