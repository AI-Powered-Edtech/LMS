/**
 * FinanceDashboard.tsx — Dasbor Keuangan & SPP Admin EduSync.
 *
 * Sections:
 *  1. Overview Cards  — 4 kartu ringkasan keuangan bulan ini
 *  2. SPP Table       — tabel tagihan siswa dengan filter & pencarian
 *  3. Monthly Chart   — grafik 6 bulan terakhir (Bar chart Recharts)
 *  4. Quick Actions   — tombol aksi cepat
 */

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/utils/cn'

import { useFinanceData } from '../hooks/useFinanceData'
import type { InvoiceFilter, InvoiceRecord, InvoiceStatusFilter } from '../types/finance'
import { exportFinanceToCSV } from '../utils/financeExport'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatRupiah(amount: number): string {
  return IDR.format(amount)
}

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

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

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

  // pending / open / draft / void
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <Clock className="w-3 h-3" />
      Belum Bayar
    </span>
  )
}

// ---------------------------------------------------------------------------
// Overview Card
// ---------------------------------------------------------------------------

interface OverviewCardProps {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
  subLabel?: string
  loading?: boolean
}

function OverviewCard({ icon, iconBg, label, value, subLabel, loading }: OverviewCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-start gap-4 shadow-sm">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
          {label}
        </p>
        {loading ? (
          <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
            {value}
          </p>
        )}
        {subLabel && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{subLabel}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton baris tabel
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyFinance() {
  return (
    <tr>
      <td colSpan={6} className="text-center py-16">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
          <Wallet className="w-12 h-12 opacity-40" />
          <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada data tagihan</p>
          <p className="text-sm">Tagihan SPP akan muncul di sini setelah ditambahkan.</p>
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Add Invoice Modal (simple stub — placeholder)
// ---------------------------------------------------------------------------

interface AddInvoiceModalProps {
  onClose: () => void
}

function AddInvoiceModal({ onClose }: AddInvoiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Tambah Tagihan Manual
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Fitur tambah tagihan manual sedang dalam pengembangan. Silakan gunakan Supabase Dashboard
          untuk input data sementara.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Send Reminder Modal (stub)
// ---------------------------------------------------------------------------

interface SendReminderModalProps {
  unpaidCount: number
  onClose: () => void
}

function SendReminderModal({ unpaidCount, onClose }: SendReminderModalProps) {
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

// ---------------------------------------------------------------------------
// Recharts Custom Tooltip
// ---------------------------------------------------------------------------

interface ChartTooltipPayloadEntry {
  name: string
  value: number
  color: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ChartTooltipPayloadEntry[]
  label?: string
  isDark?: boolean
}

function ChartTooltip({ active, payload, label, isDark }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 shadow-lg text-sm',
        isDark
          ? 'bg-slate-800 border-slate-700 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      )}
    >
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{formatRupiah(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10

export function FinanceDashboard() {
  // ─── Filter State ──────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<InvoiceFilter>({
    status: 'all',
    search: '',
    page: 1,
    pageSize: PAGE_SIZE,
  })
  const [searchInput, setSearchInput] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)

  // ─── Data ──────────────────────────────────────────────────────────────────
  const {
    overviewStats,
    invoices,
    totalCount,
    monthlyData,
    isLoading,
    isOverviewLoading,
    isMonthlyLoading,
  } = useFinanceData(filter)

  // ─── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function handleSearch() {
    setFilter((f) => ({ ...f, search: searchInput, page: 1 }))
  }

  function handleStatusChange(status: InvoiceStatusFilter) {
    setFilter((f) => ({ ...f, status, page: 1 }))
  }

  // ─── Export CSV ────────────────────────────────────────────────────────────
  function handleExport() {
    exportFinanceToCSV(invoices)
  }

  // ─── Unpaid count for reminder ─────────────────────────────────────────────
  const unpaidCount = invoices.filter((inv) => {
    const s = (inv.status ?? '').toLowerCase()
    return !['paid', 'lunas'].includes(s)
  }).length

  // ─── Dark mode detection ───────────────────────────────────────────────────
  const isDark = document.documentElement.classList.contains('dark')

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Keuangan & SPP</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pantau tagihan, pembayaran, dan laporan keuangan sekolah
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
            Bulan Ini
          </span>
        </div>
      </div>

      {/* ── Section 1: Overview Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <OverviewCard
          icon={<Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          label="Total Tagihan Bulan Ini"
          value={overviewStats ? formatRupiah(overviewStats.total_this_month) : 'Rp 0'}
          subLabel="Total semua tagihan bulan berjalan"
          loading={isOverviewLoading}
        />
        <OverviewCard
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          label="Sudah Dibayar"
          value={overviewStats ? formatRupiah(overviewStats.paid_this_month) : 'Rp 0'}
          subLabel="Tagihan lunas bulan berjalan"
          loading={isOverviewLoading}
        />
        <OverviewCard
          icon={<Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          label="Belum Dibayar"
          value={overviewStats ? formatRupiah(overviewStats.unpaid_total) : 'Rp 0'}
          subLabel="Pending & terlambat keseluruhan"
          loading={isOverviewLoading}
        />
        <OverviewCard
          icon={<TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          label="Tingkat Pembayaran"
          value={overviewStats ? `${overviewStats.payment_rate}%` : '0%'}
          subLabel="Persentase tagihan bulan ini terlunasi"
          loading={isOverviewLoading}
        />
      </div>

      {/* ── Section 2: SPP Table ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Table header + filters */}
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

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { value: 'all', label: 'Semua' },
                { value: 'paid', label: 'Lunas' },
                { value: 'pending', label: 'Belum Bayar' },
                { value: 'overdue', label: 'Terlambat' },
              ] as { value: InvoiceStatusFilter; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatusChange(value)}
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

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Cari
            </button>
          </div>
        </div>

        {/* Table */}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Halaman {filter.page} dari {totalPages} ({totalCount} data)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                disabled={filter.page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => setFilter((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
                disabled={filter.page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: Monthly Chart ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">
            Tren Pembayaran 6 Bulan Terakhir
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Perbandingan total tagihan vs. jumlah yang terlunasi per bulan
        </p>

        {isMonthlyLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : monthlyData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
            <TrendingUp className="w-10 h-10 opacity-30" />
            <p className="text-sm">Belum ada data historis pembayaran</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#334155' : '#e2e8f0'}
                  vertical={false}
                />
                <XAxis
                  dataKey="month_label"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(0)}jt`
                      : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}rb`
                        : String(v)
                  }
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  content={<ChartTooltip isDark={isDark} />}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'total' ? 'Total Tagihan' : 'Sudah Dibayar'
                  }
                  wrapperStyle={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}
                />
                <Bar
                  dataKey="total"
                  name="total"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="paid"
                  name="paid"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Section 4: Quick Actions ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Aksi Cepat</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tambah Tagihan Manual */}
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                Tambah Tagihan
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Input tagihan manual</p>
            </div>
          </button>

          {/* Ekspor Laporan CSV */}
          <button
            onClick={handleExport}
            disabled={invoices.length === 0}
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors shrink-0">
              <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">Ekspor CSV</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Unduh laporan keuangan</p>
            </div>
          </button>

          {/* Kirim Pengingat */}
          <button
            onClick={() => setReminderModalOpen(true)}
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
                {unpaidCount > 0 ? `${unpaidCount} siswa belum bayar` : 'Notifikasi pembayaran'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {addModalOpen && <AddInvoiceModal onClose={() => setAddModalOpen(false)} />}
      {reminderModalOpen && (
        <SendReminderModal unpaidCount={unpaidCount} onClose={() => setReminderModalOpen(false)} />
      )}
    </div>
  )
}
