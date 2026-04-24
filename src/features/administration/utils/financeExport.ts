/**
 * financeExport.ts — Export data keuangan/SPP ke CSV.
 *
 * Kolom: Nama Siswa, Email, Bulan, Keterangan, Jumlah (Rp), Status, Tanggal Bayar, Dibuat
 */

import { formatCurrency } from '@/shared/utils/format-id'

import type { InvoiceRecord } from '../types/finance'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDateWIB(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const wibOffset = 7 * 60
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000
  const wib = new Date(utcMs + wibOffset * 60_000)
  return `${String(wib.getDate()).padStart(2, '0')} ${ID_MONTHS[wib.getMonth()]} ${wib.getFullYear()}`
}

function formatMonthYear(monthYear: string | null): string {
  if (!monthYear) return ''
  const [year, month] = monthYear.split('-')
  const idx = parseInt(month ?? '1', 10) - 1
  return `${ID_MONTHS[idx] ?? month} ${year}`
}

function normalizeStatus(status: string): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'paid' || s === 'lunas') return 'Lunas'
  if (s === 'overdue' || s === 'terlambat' || s === 'uncollectible') return 'Terlambat'
  return 'Belum Bayar'
}

function csvCell(value: string): string {
  const escaped = String(value).replace(/"/g, '""')
  return `"${escaped}"`
}

function buildRow(cells: string[]): string {
  return cells.map(csvCell).join(',')
}

function buildFilename(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `laporan-keuangan-${yyyy}-${mm}-${dd}.csv`
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Export data invoice ke file CSV yang langsung diunduh oleh browser.
 * BOM (\uFEFF) agar Excel membuka dengan encoding UTF-8 yang benar.
 */
export function exportFinanceToCSV(invoices: InvoiceRecord[]): void {
  const header = buildRow([
    'Nama Siswa',
    'Email Siswa',
    'Bulan',
    'Keterangan',
    'Jumlah (Rp)',
    'Status',
    'Tanggal Bayar',
    'Dibuat',
  ])

  const rows = invoices.map((inv) =>
    buildRow([
      inv.student_name ?? '',
      inv.student_email ?? '',
      formatMonthYear(inv.month_year) || formatDateWIB(inv.created_at),
      inv.description ?? 'SPP',
      formatCurrency(inv.amount_due),
      normalizeStatus(inv.status),
      formatDateWIB(inv.paid_at),
      formatDateWIB(inv.created_at),
    ])
  )

  const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.setAttribute('download', buildFilename())
  document.body.appendChild(anchor)
  anchor.click()

  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
