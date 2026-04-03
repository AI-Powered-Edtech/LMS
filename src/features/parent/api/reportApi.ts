// ==========================================================================
// Parent Report API — reportApi.ts
// Wave 4 — Task 29.6: Monthly Progress Report
//
// Memanggil Edge Function generate-parent-report untuk mendapatkan data laporan
// bulanan siswa. RLS di Edge Function memastikan orang tua hanya bisa melihat
// data anak mereka sendiri.
// ==========================================================================

import { supabase } from '@/services/supabase/client'

import type { AvailableReportMonth, ParentMonthlyReport } from '../types'

// ── Indonesian Month Names ──────────────────────────────────────

const ID_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

// ── Get Monthly Report ──────────────────────────────────────────

/**
 * Memanggil Edge Function generate-parent-report untuk mendapatkan laporan
 * perkembangan bulanan siswa.
 */
export async function getMonthlyReport(
  studentId: string,
  month: number,
  year: number,
  tenantId: string
): Promise<ParentMonthlyReport> {
  const { data, error } = await supabase.functions.invoke('generate-parent-report', {
    body: { studentId, month, year, tenantId },
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[reportApi] getMonthlyReport error:', error)
    throw new Error('Gagal memuat laporan. Silakan coba lagi.')
  }

  if (!data?.reportData) {
    throw new Error('Data laporan tidak ditemukan.')
  }

  return data.reportData as ParentMonthlyReport
}

// ── Get Available Report Months ─────────────────────────────────

/**
 * Mengambil bulan-bulan yang tersedia (ada data aktivitas) untuk laporan siswa.
 * Menggunakan lesson_progress sebagai indikator utama aktivitas belajar.
 * Mengembalikan maksimal 12 bulan terakhir.
 */
export async function getAvailableReportMonths(
  studentId: string,
  tenantId: string
): Promise<AvailableReportMonth[]> {
  // Ambil tanggal completion pelajaran per bulan
  const { data: lessonData, error: lessonError } = await supabase
    .from('lesson_progress')
    .select('completed_at')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .eq('completed', true)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(200)

  if (lessonError) {
    if (import.meta.env.DEV)
      console.error('[reportApi] getAvailableReportMonths lesson error:', lessonError)
  }

  // Ambil juga dari attendance_records sebagai fallback
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('date')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(200)

  if (attendanceError) {
    if (import.meta.env.DEV)
      console.error('[reportApi] getAvailableReportMonths attendance error:', attendanceError)
  }

  // Kumpulkan semua bulan unik dari kedua sumber
  const monthSet = new Set<string>()

  for (const row of (lessonData ?? []) as Record<string, unknown>[]) {
    const date = new Date(row.completed_at as string)
    if (!isNaN(date.getTime())) {
      monthSet.add(`${date.getFullYear()}-${date.getMonth() + 1}`)
    }
  }

  for (const row of (attendanceData ?? []) as Record<string, unknown>[]) {
    const date = new Date(row.date as string)
    if (!isNaN(date.getTime())) {
      monthSet.add(`${date.getFullYear()}-${date.getMonth() + 1}`)
    }
  }

  // Jika tidak ada data sama sekali, kembalikan bulan ini dan 2 bulan lalu sebagai default
  if (monthSet.size === 0) {
    const now = new Date()
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthSet.add(`${d.getFullYear()}-${d.getMonth() + 1}`)
    }
  }

  // Convert ke array dan sort descending
  const months: AvailableReportMonth[] = Array.from(monthSet)
    .map((key) => {
      const [yearStr, monthStr] = key.split('-')
      const y = parseInt(yearStr, 10)
      const m = parseInt(monthStr, 10)
      const monthName = `${ID_MONTHS[m - 1]} ${y}`
      return {
        month: m,
        year: y,
        month_name: monthName,
        label: monthName,
      }
    })
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })
    .slice(0, 12) // Maksimal 12 bulan terakhir

  return months
}
