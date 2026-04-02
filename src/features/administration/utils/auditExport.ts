/**
 * auditExport.ts — Export audit logs ke CSV untuk compliance reporting.
 *
 * Kolom CSV: Waktu, Aktor, Email Aktor, Aksi, Target, Detail
 */

import type { AuditLog } from '@/features/administration/api/administrationService'

// ---------------------------------------------------------------------------
// Action label map (Bahasa Indonesia)
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  ROLE_CHANGED: 'Ubah Peran',
  USER_DEACTIVATED: 'Nonaktifkan Pengguna',
  USER_ACTIVATED: 'Aktifkan Pengguna',
  INVITATION_SENT: 'Kirim Undangan',
  PASSWORD_RESET: 'Atur Ulang Kata Sandi',
  MODULE_TOGGLED: 'Toggle Modul',
  FEATURE_FLAG_CHANGED: 'Ubah Fitur Flag',
  USER_CREATED: 'Buat Pengguna',
  USER_DELETED: 'Hapus Pengguna',
  SETTINGS_UPDATED: 'Ubah Pengaturan',
}

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

// ---------------------------------------------------------------------------
// Date formatting (Bahasa Indonesia, WIB timezone UTC+7)
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

function formatDateWIB(dateStr: string): string {
  const date = new Date(dateStr)
  // Shift to WIB (UTC+7)
  const wibOffset = 7 * 60 // minutes
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000
  const wibDate = new Date(utcMs + wibOffset * 60_000)

  const dd = String(wibDate.getDate()).padStart(2, '0')
  const mmm = ID_MONTHS[wibDate.getMonth()]
  const yyyy = wibDate.getFullYear()
  const hh = String(wibDate.getHours()).padStart(2, '0')
  const min = String(wibDate.getMinutes()).padStart(2, '0')

  return `${dd} ${mmm} ${yyyy} ${hh}:${min} WIB`
}

// ---------------------------------------------------------------------------
// Detail serialiser — flatten the details object to a readable string
// ---------------------------------------------------------------------------

function formatDetails(log: AuditLog): string {
  const d = log.details
  if (!d || Object.keys(d).length === 0) return ''

  if (log.action === 'ROLE_CHANGED' && d.old_role && d.new_role) {
    return `${String(d.old_role)} → ${String(d.new_role)}`
  }

  if (d.is_active !== undefined) {
    return `Status: ${d.is_active ? 'Aktif' : 'Nonaktif'}`
  }

  // Generic fallback: key=value pairs
  return Object.entries(d)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('; ')
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Escape a single CSV cell value.
 * Wraps in double quotes and escapes internal double-quote chars.
 */
function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}

function buildCSVRow(cells: string[]): string {
  return cells.map(csvCell).join(',')
}

// ---------------------------------------------------------------------------
// Date range filter
// ---------------------------------------------------------------------------

function isInDateRange(dateStr: string, range?: { from: Date; to: Date }): boolean {
  if (!range) return true
  const date = new Date(dateStr)
  return date >= range.from && date <= range.to
}

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

function buildFilename(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `audit-log-${yyyy}-${mm}-${dd}.csv`
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Export audit logs ke file CSV yang langsung diunduh oleh browser.
 *
 * @param logs       Array of AuditLog dari API
 * @param dateRange  Opsional — filter rentang tanggal { from, to }
 */
export function exportAuditLogsToCSV(logs: AuditLog[], dateRange?: { from: Date; to: Date }): void {
  const header = buildCSVRow(['Waktu', 'Aktor', 'Email Aktor', 'Aksi', 'Target', 'Detail'])

  const filteredLogs = dateRange
    ? logs.filter((log) => isInDateRange(log.created_at, dateRange))
    : logs

  const rows = filteredLogs.map((log) =>
    buildCSVRow([
      formatDateWIB(log.created_at),
      log.actor_name,
      log.actor_email,
      getActionLabel(log.action),
      log.target_name ?? '',
      formatDetails(log),
    ])
  )

  // BOM (\uFEFF) agar Excel membuka dengan encoding UTF-8 yang benar
  const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.setAttribute('download', buildFilename())
  document.body.appendChild(anchor)
  anchor.click()

  // Cleanup
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
