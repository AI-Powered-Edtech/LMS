import { exportCsv } from '@/shared/utils/export-table'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GradebookExportData {
  entries: {
    id: string
    student_id: string
    assignment_id: string | null
    quiz_id: string | null
    score: number | null
    max_score: number
    percentage: number
    grade_letter: string | null
  }[]
  columns: {
    id: string
    title: string
    type: 'quiz' | 'assignment'
    max_score: number
  }[]
  students: {
    id: string
    name: string
    email: string
  }[]
  /** Nama kelas/kursus untuk dipakai di nama file */
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveStatus(average: number): string {
  if (average >= 90) return 'Sangat Baik'
  if (average >= 80) return 'Baik'
  if (average >= 70) return 'Cukup'
  if (average >= 60) return 'Perlu Peningkatan'
  if (average > 0) return 'Kurang'
  return 'Belum Ada Nilai'
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ── Main export function ──────────────────────────────────────────────────────

type ExportEntry = GradebookExportData['entries'][number]

/**
 * Mengekspor data gradebook ke file CSV dan memicu unduhan di browser.
 *
 * Kolom: No, Nama Siswa, Email, [setiap assignment], Rata-rata (%), Status
 *
 * @param data  - Data gradebook lengkap (entries, columns, students)
 * @param filename - Nama file tanpa ekstensi (opsional, auto-generated jika tidak diisi)
 */
export function exportGradebookToCSV(data: GradebookExportData, filename?: string): void {
  const { entries, columns, students, className } = data

  // Kumpulkan nilai tiap siswa dari entries
  const gradeMap = new Map<string, Record<string, ExportEntry | null>>()

  for (const entry of entries) {
    if (!gradeMap.has(entry.student_id)) {
      gradeMap.set(entry.student_id, {})
    }
    const colId = entry.quiz_id ?? entry.assignment_id
    if (colId) {
      gradeMap.get(entry.student_id)![colId] = entry
    }
  }

  // Pre-compute header keys untuk performa (hindari template literal berulang)
  const colHeaders = columns.map((col) => ({
    id: col.id,
    scoreLabel: col.title,
    pctLabel: `${col.title} (%)`,
    letterLabel: `${col.title} (Huruf)`,
    maxScore: col.max_score,
  }))

  // Susun baris CSV
  type CsvRow = Record<string, string | number>
  const rows: CsvRow[] = []

  students.forEach((student, idx) => {
    const studentGrades = gradeMap.get(student.id) ?? {}

    const row: CsvRow = {
      No: idx + 1,
      'Nama Siswa': student.name,
      Email: student.email,
    }

    let totalPct = 0
    let gradedCount = 0

    for (const col of colHeaders) {
      const entry = studentGrades[col.id] ?? null
      if (entry && entry.score !== null) {
        row[col.scoreLabel] = entry.score
        row[col.pctLabel] = Number(entry.percentage.toFixed(1))
        row[col.letterLabel] = entry.grade_letter ?? '-'
        totalPct += entry.percentage
        gradedCount++
      } else {
        row[col.scoreLabel] = '-'
        row[col.pctLabel] = '-'
        row[col.letterLabel] = '-'
      }
    }

    const average = gradedCount > 0 ? Number((totalPct / gradedCount).toFixed(1)) : 0
    row['Rata-rata (%)'] = gradedCount > 0 ? average : '-'
    row['Status'] = deriveStatus(average)

    rows.push(row)
  })

  // Jika tidak ada siswa, tambahkan baris kosong agar file tetap valid
  if (rows.length === 0) {
    rows.push({
      No: '-',
      'Nama Siswa': '-',
      Email: '-',
      'Rata-rata (%)': '-',
      Status: '-',
    })
  }

  // Generate nama file
  const dateStr = new Date().toISOString().slice(0, 10)
  const classSlug = className ? `-${sanitizeFilename(className)}` : ''
  const resolvedFilename = filename ? `${filename}.csv` : `gradebook${classSlug}-${dateStr}.csv`

  exportCsv(resolvedFilename, rows)
}
