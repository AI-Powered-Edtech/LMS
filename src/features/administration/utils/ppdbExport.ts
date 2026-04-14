/**
 * ppdbExport.ts — Export data pendaftar PPDB ke CSV.
 *
 * Kolom: No. Pendaftaran, Nama Siswa, Tanggal Lahir, Jenis Kelamin,
 *        Asal Sekolah, Nama Ortu, Telepon Ortu, Email Ortu, Alamat,
 *        Status, Catatan, Tanggal Daftar
 */

import type { PPDBRegistration } from '../types/ppdb'

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

function translateStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Menunggu'
    case 'reviewed':
      return 'Direview'
    case 'accepted':
      return 'Diterima'
    case 'rejected':
      return 'Ditolak'
    case 'waitlisted':
      return 'Cadangan'
    default:
      return status
  }
}

function translateGender(gender: string): string {
  return gender === 'L' ? 'Laki-laki' : 'Perempuan'
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
  return `ppdb-pendaftar-${yyyy}-${mm}-${dd}.csv`
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export function exportPPDBToCSV(registrations: PPDBRegistration[]): void {
  const header = buildRow([
    'No. Pendaftaran',
    'Nama Siswa',
    'Tanggal Lahir',
    'Jenis Kelamin',
    'Asal Sekolah',
    'Nama Orang Tua',
    'Telepon Orang Tua',
    'Email Orang Tua',
    'Alamat',
    'Status',
    'Catatan',
    'Tanggal Daftar',
  ])

  const rows = registrations.map((reg) =>
    buildRow([
      reg.registration_number,
      reg.student_name,
      formatDateWIB(reg.birth_date),
      translateGender(reg.gender),
      reg.previous_school ?? '',
      reg.parent_name,
      reg.parent_phone,
      reg.parent_email ?? '',
      reg.address ?? '',
      translateStatus(reg.status),
      reg.notes ?? '',
      formatDateWIB(reg.created_at),
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
