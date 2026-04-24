/**
 * FinanceDashboard.tsx — Dasbor Keuangan & SPP Admin EduSync.
 *
 * Sections:
 *  1. Overview Cards  — extracted to FinanceSummaryCards
 *  2. SPP Table       — extracted to FinanceTransactionTable
 *  3. Monthly Chart   — grafik 6 bulan terakhir (Bar chart Recharts)
 *  4. Quick Actions   — extracted to FinanceExportPanel
 */

import { useQueryClient } from '@tanstack/react-query'
import { Loader2, TrendingUp } from 'lucide-react'
import { useState } from 'react'
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

import { useToast } from '@/hooks/useToast'
import { formatCurrency as formatRupiah } from '@/shared/utils/format-id'
import { cn } from '@/utils/cn'

import { reconcileInvoicePayment } from '../api/financeApi'
import { useFinanceData } from '../hooks/useFinanceData'
import type { InvoiceFilter, InvoiceStatusFilter } from '../types/finance'
import { exportFinanceToCSV } from '../utils/financeExport'
import { AddInvoiceModal } from './finance/AddInvoiceModal'
import { FinanceExportPanel } from './finance/FinanceExportPanel'
import { FinanceReconcileModal } from './finance/FinanceReconcileModal'
import { FinanceSummaryCards } from './finance/FinanceSummaryCards'
import { FinanceTransactionTable } from './finance/FinanceTransactionTable'

const PAGE_SIZE = 10

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

export function FinanceDashboard() {
  const [filter, setFilter] = useState<InvoiceFilter>({
    status: 'all',
    search: '',
    page: 1,
    pageSize: PAGE_SIZE,
  })
  const [searchInput, setSearchInput] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)

  const queryClient = useQueryClient()
  const addToast = useToast((s) => s.addToast)

  const {
    overviewStats,
    invoices,
    totalCount,
    monthlyData,
    isLoading,
    isOverviewLoading,
    isMonthlyLoading,
  } = useFinanceData(filter)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function handleSearch() {
    setFilter((f) => ({ ...f, search: searchInput, page: 1 }))
  }

  function handleStatusChange(status: InvoiceStatusFilter) {
    setFilter((f) => ({ ...f, status, page: 1 }))
  }

  function handleExport() {
    exportFinanceToCSV(invoices)
  }

  async function handleMarkAsPaid(invoiceId: string, amount: number) {
    if (!confirm('Tandai tagihan ini sebagai sudah dibayar?')) return
    setIsMarkingPaid(true)
    try {
      await reconcileInvoicePayment({
        invoiceId,
        amount,
        method: 'transfer',
        notes: 'Dilunasi dari dashboard keuangan',
      })
      await queryClient.invalidateQueries({ queryKey: ['finance'] })
      addToast({ message: 'Tagihan berhasil ditandai lunas', type: 'success' })
    } catch (err) {
      addToast({
        message: 'Gagal menandai tagihan: ' + (err as Error).message,
        type: 'error',
      })
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const unpaidCount = invoices.filter((inv) => {
    const s = (inv.status ?? '').toLowerCase()
    return !['paid', 'lunas'].includes(s)
  }).length

  const isDark = document.documentElement.classList.contains('dark')

  return (
    <div className="space-y-6">
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

      <FinanceSummaryCards overviewStats={overviewStats} loading={isOverviewLoading} />

      <FinanceTransactionTable
        invoices={invoices}
        totalCount={totalCount}
        totalPages={totalPages}
        filter={filter}
        searchInput={searchInput}
        isLoading={isLoading}
        isMarkingPaid={isMarkingPaid}
        onSearch={handleSearch}
        onSearchInputChange={setSearchInput}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={handleMarkAsPaid}
        onPageChange={(page) => setFilter((f) => ({ ...f, page }))}
      />

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

      <FinanceExportPanel
        invoicesCount={invoices.length}
        unpaidCount={unpaidCount}
        onAddInvoice={() => setAddModalOpen(true)}
        onExport={handleExport}
        onReminder={() => setReminderModalOpen(true)}
      />

      {addModalOpen && (
        <AddInvoiceModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['finance'] })}
        />
      )}
      {reminderModalOpen && (
        <FinanceReconcileModal
          invoiceIds={[]}
          unpaidCount={unpaidCount}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ['finance'] })}
          onClose={() => setReminderModalOpen(false)}
        />
      )}
    </div>
  )
}
