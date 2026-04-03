import Papa from 'papaparse'

import type { GradebookColumn, GradebookEntry, GradebookStudent } from '../types'

/**
 * Transform gradebook data ke format CSV yang kompatibel Excel.
 * Setiap baris = satu siswa, setiap kolom = satu assignment/quiz.
 */

interface GradeExportRow {
  No: number
  'Nama Lengkap': string
  Email: string
  [key: string]: string | number
}

/**
 * Konversi GradebookData ke array of objects untuk CSV export.
 */
export function transformGradesToExportData(
  entries: GradebookEntry[],
  columns: GradebookColumn[],
  students: GradebookStudent[]
): GradeExportRow[] {
  const gradeMap = new Map<string, Record<string, GradebookEntry | null>>()

  for (const entry of entries) {
    if (!gradeMap.has(entry.student_id)) {
      gradeMap.set(entry.student_id, {})
    }
    const colId = entry.quiz_id ?? entry.assignment_id
    if (colId) {
      gradeMap.get(entry.student_id)![colId] = entry
    }
  }

  return students.map((student, idx) => {
    const studentGrades = gradeMap.get(student.id) ?? {}
    const row: GradeExportRow = {
      No: idx + 1,
      'Nama Lengkap': student.name,
      Email: student.email,
    }

    for (const col of columns) {
      const entry = studentGrades[col.id] ?? null
      if (entry && entry.score !== null) {
        row[col.title] = entry.score
        row[`${col.title} (%)`] = Number(entry.percentage.toFixed(1))
        row[`${col.title} (Huruf)`] = entry.grade_letter ?? '-'
      } else {
        row[col.title] = '-'
        row[`${col.title} (%)`] = '-'
        row[`${col.title} (Huruf)`] = '-'
      }
    }

    row['Rata-rata (%)'] = student.average > 0 ? Number(student.average.toFixed(1)) : '-'
    return row
  })
}

/**
 * Generate CSV string dari grade export data.
 */
export function generateGradeCSV(rows: GradeExportRow[]): string {
  return Papa.unparse(rows, {
    delimiter: ',',
    header: true,
    quotes: true,
  })
}

/**
 * Download CSV file dengan BOM untuk kompatibilitas Excel.
 */
export function downloadCSV(csv: string, filename: string): void {
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Fungsi export lengkap: transform -> generate -> download.
 */
export function exportGrades(
  entries: GradebookEntry[],
  columns: GradebookColumn[],
  students: GradebookStudent[],
  className?: string
): void {
  const rows = transformGradesToExportData(entries, columns, students)
  const csv = generateGradeCSV(rows)
  const date = new Date().toISOString().slice(0, 10)
  const slug = className
    ? `-${className
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')}`
    : ''
  downloadCSV(csv, `nilai${slug}-${date}`)
}
