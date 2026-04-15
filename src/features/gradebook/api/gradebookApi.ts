import Papa from 'papaparse'

import {  apiFetch } from '@/src/lib/api'

import type { GradebookColumn, GradebookEntry, GradebookSettings } from '../types'

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Mengambil semua entri gradebook untuk satu kursus, termasuk nama siswa,
 * judul tugas/kuis, dan tipe item (quiz|assignment).
 */
export async function fetchGradebookEntries(
  _courseId: string,
  _tenantId: string
): Promise<GradebookEntry[]> {
  const { data, error } = await apiFetch('/gradebook_entries')

  if (error) throw error
  return ((data ?? []) as any[]).map((row: any) => {
    const profile = row.profiles as unknown as {
      first_name: string
      last_name: string
      email: string
    } | null
    const assignment = row.assignments as unknown as { title: string } | null
    const quiz = row.quizzes as unknown as { title: string } | null

    const studentName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : undefined
    const itemType: 'quiz' | 'assignment' | undefined = row.quiz_id
      ? 'quiz'
      : row.assignment_id
        ? 'assignment'
        : undefined
    const itemTitle = quiz?.title ?? assignment?.title ?? undefined

    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      student_id: row.student_id as string,
      course_id: row.course_id as string,
      assignment_id: (row.assignment_id as string | null) ?? null,
      quiz_id: (row.quiz_id as string | null) ?? null,
      score: (row.score as number | null) ?? null,
      max_score: row.max_score as number,
      percentage: (row.percentage as number) ?? 0,
      grade_letter: (row.grade_letter as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      graded_by: (row.graded_by as string | null) ?? null,
      graded_at: (row.graded_at as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      student_name: studentName,
      student_email: profile?.email ?? undefined,
      item_title: itemTitle,
      item_type: itemType,
    } satisfies GradebookEntry
  })
}

// ── Update ───────────────────────────────────────────────────────────────────

/**
 * Memperbarui nilai, catatan, atau huruf mutu pada entri yang sudah ada.
 */
export async function updateGradebookEntry(
  _id: string,
  _updates: Partial<Pick<GradebookEntry, 'score' | 'notes' | 'grade_letter'>>
): Promise<GradebookEntry> {
  const { data, error } = await apiFetch('/gradebook_entries')

  if (error) throw error

  return data as unknown as GradebookEntry
}

// ── Upsert entry ─────────────────────────────────────────────────────────────

/**
 * Menyimpan (insert atau update) satu entri nilai.
 * percentage adalah generated column, tidak boleh dikirim ke API.
 */
export async function upsertGradebookEntry(
  _entry: Omit<GradebookEntry, 'id' | 'percentage'>
): Promise<GradebookEntry> {
  const { data, error } = await apiFetch('/gradebook_entries')

  if (error) throw error

  return data as unknown as GradebookEntry
}

// ── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Memanggil RPC sync_gradebook_entries untuk menyalin nilai dari quiz_attempts
 * ke gradebook_entries. Mengembalikan jumlah baris yang di-upsert.
 */
export async function syncGradebook(courseId: string, tenantId: string): Promise<number> {
  const { data, error } = await apiFetch('/rpc/sync_gradebook_entries', { method: 'POST', body: JSON.stringify({
      p_course_id: courseId,
      p_tenant_id: tenantId,
    }) })

  if (error) throw error

  return (data as number) ?? 0
}

// ── Settings ─────────────────────────────────────────────────────────────────

/**
 * Mengambil pengaturan gradebook untuk satu kursus.
 * Mengembalikan null jika belum dikonfigurasi.
 */
export async function fetchGradebookSettings(
  _courseId: string,
  _tenantId: string
): Promise<GradebookSettings | null> {
  const { data, error } = await apiFetch('/gradebook_settings')

  if (error) throw error

  return (data as GradebookSettings | null) ?? null
}

/**
 * Menyimpan (insert atau update) pengaturan gradebook untuk satu kursus.
 */
export async function upsertGradebookSettings(
  _settings: Omit<GradebookSettings, 'id'>
): Promise<GradebookSettings> {
  const { data, error } = await apiFetch('/gradebook_settings')

  if (error) throw error

  return data as unknown as GradebookSettings
}

// ── CSV Export ────────────────────────────────────────────────────────────────

/**
 * Mengekspor data gradebook ke file CSV dan memicu unduhan di browser.
 * Baris: satu siswa per baris. Kolom: nama siswa, tiap item penilaian, rata-rata.
 */
export function exportGradebookCSV(entries: GradebookEntry[], columns: GradebookColumn[]): void {
  // Kumpulkan daftar siswa unik beserta datanya
  const studentMap = new Map<
    string,
    { name: string; email: string; grades: Record<string, GradebookEntry | null> }
  >()

  for (const entry of entries) {
    if (!studentMap.has(entry.student_id)) {
      studentMap.set(entry.student_id, {
        name: entry.student_name ?? entry.student_id,
        email: entry.student_email ?? '',
        grades: {},
      })
    }
    const colId = entry.quiz_id ?? entry.assignment_id ?? ''
    if (colId) {
      studentMap.get(entry.student_id)!.grades[colId] = entry
    }
  }

  // Susun baris CSV
  const rows: Record<string, string | number>[] = []

  for (const [, student] of studentMap) {
    const row: Record<string, string | number> = {
      Nama: student.name,
      Email: student.email,
    }

    let totalPct = 0
    let gradedCount = 0

    for (const col of columns) {
      const entry = student.grades[col.id] ?? null
      if (entry && entry.score !== null) {
        row[col.title] = entry.score
        row[`${col.title} (Maks)`] = col.max_score
        row[`${col.title} (%)`] = Number(entry.percentage.toFixed(1))
        row[`${col.title} (Huruf)`] = entry.grade_letter ?? '-'
        totalPct += entry.percentage
        gradedCount++
      } else {
        row[col.title] = '-'
        row[`${col.title} (Maks)`] = col.max_score
        row[`${col.title} (%)`] = '-'
        row[`${col.title} (Huruf)`] = '-'
      }
    }

    row['Rata-rata (%)'] = gradedCount > 0 ? Number((totalPct / gradedCount).toFixed(1)) : '-'
    rows.push(row)
  }

  const csv = Papa.unparse(rows)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `gradebook_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
