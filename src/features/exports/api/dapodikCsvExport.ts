import { db } from '@/services/db'

/**
 * Client-side Dapodik-style CSV exports (Fase 5 Unit 37 — CSV-only export).
 *
 * Generates the CSV in the browser from data plane queries. For very large
 * tenants, prefer the Rust dapodik_export_jobs path (queues + writes to
 * storage). This module is the immediate, no-job-queue fallback.
 */

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  return lines.join('\n')
}

function downloadCsv(filename: string, csvContent: string) {
  const bom = '\uFEFF' // Excel needs BOM for UTF-8 detection
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const dapodikCsvExport = {
  async exportStudents(tenantId: string): Promise<void> {
    const { data, error } = await db
      .from('profiles')
      .select(
        'id, email, first_name, last_name, full_name, phone, student_dossier(nisn, nik, gender, place_of_birth, date_of_birth, address_kelurahan, address_kecamatan, address_kota_kab, father_name, mother_name)',
      )
      .eq('tenant_id', tenantId)
    if (error) throw error
    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((p) => {
      const d = (p as { student_dossier?: Record<string, unknown> }).student_dossier ?? {}
      return [
        p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        d.nisn,
        d.nik,
        d.gender,
        d.place_of_birth,
        d.date_of_birth,
        p.email,
        p.phone,
        d.address_kelurahan,
        d.address_kecamatan,
        d.address_kota_kab,
        d.father_name,
        d.mother_name,
      ]
    })
    const csv = rowsToCsv(
      [
        'Nama Lengkap',
        'NISN',
        'NIK',
        'Jenis Kelamin',
        'Tempat Lahir',
        'Tanggal Lahir',
        'Email',
        'Telepon',
        'Kelurahan',
        'Kecamatan',
        'Kota/Kab',
        'Nama Ayah',
        'Nama Ibu',
      ],
      rows,
    )
    downloadCsv(`dapodik-siswa-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  },

  async exportStaff(tenantId: string): Promise<void> {
    const { data, error } = await db
      .from('profiles')
      .select(
        'id, email, full_name, phone, staff_dossier(nip, nuptk, employment_status, education_level, teaching_certificate)',
      )
      .eq('tenant_id', tenantId)
    if (error) throw error
    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((p) => {
      const d = (p as { staff_dossier?: Record<string, unknown> }).staff_dossier ?? {}
      return [
        p.full_name,
        d.nip,
        d.nuptk,
        d.employment_status,
        d.education_level,
        d.teaching_certificate,
        p.email,
        p.phone,
      ]
    })
    const csv = rowsToCsv(
      [
        'Nama Lengkap',
        'NIP',
        'NUPTK',
        'Status Kepegawaian',
        'Pendidikan Terakhir',
        'Sertifikat Pendidik',
        'Email',
        'Telepon',
      ],
      rows,
    )
    downloadCsv(`dapodik-staf-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  },

  async exportRombel(tenantId: string): Promise<void> {
    const { data, error } = await db
      .from('rombel')
      .select('id, code, name, capacity, status, wali_kelas_id, academic_year_id')
      .eq('tenant_id', tenantId)
    if (error) throw error
    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => [
      r.code,
      r.name,
      r.capacity,
      r.status,
      r.wali_kelas_id,
      r.academic_year_id,
    ])
    const csv = rowsToCsv(
      ['Kode Rombel', 'Nama', 'Kapasitas', 'Status', 'Wali Kelas ID', 'Tahun Ajaran ID'],
      rows,
    )
    downloadCsv(`dapodik-rombel-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  },
}
