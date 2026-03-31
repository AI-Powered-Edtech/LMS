import Papa from 'papaparse'

import { supabase } from '@/src/services/supabase/client'

import type { GradebookColumn, GradebookEntry, GradebookSettings } from '../types'

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Mengambil semua entri gradebook untuk satu kursus, termasuk nama siswa,
 * judul tugas/kuis, dan tipe item (quiz|assignment).
 */
export async function fetchGradebookEntries(
  courseId: string,
  tenantId: string
): Promise<GradebookEntry[]> {
  const { data, error } = await supabase
    .from('gradebook_entries')
    .select(
      `
      id,
      tenant_id,
      student_id,
      course_id,
      assignment_id,
      quiz_id,
      score,
      max_score,
      percentage,
      grade_letter,
      notes,
      graded_by,
      graded_at,
      created_at,
      updated_at,
      profiles:student_id (
        first_name,
        last_name,
        email
      ),
      assignments:assignment_id (
        title
      ),
      quizzes:quiz_id (
        title
      )
      `
    )
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw error

  type RawRow = typeof data extends (infer R)[] | null ? R : never

  return ((data ?? []) as RawRow[]).map((row) => {
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
  id: string,
  updates: Partial<Pick<GradebookEntry, 'score' | 'notes' | 'grade_letter'>>
): Promise<GradebookEntry> {
  const { data, error } = await supabase
    .from('gradebook_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(
      `id, tenant_id, student_id, course_id, assignment_id, quiz_id,
       score, max_score, percentage, grade_letter, notes,
       graded_by, graded_at, created_at, updated_at`
    )
    .single()

  if (error) throw error

  return data as unknown as GradebookEntry
}

// ── Upsert entry ─────────────────────────────────────────────────────────────

/**
 * Menyimpan (insert atau update) satu entri nilai.
 * percentage adalah generated column, tidak boleh dikirim ke Supabase.
 */
export async function upsertGradebookEntry(
  entry: Omit<GradebookEntry, 'id' | 'percentage'>
): Promise<GradebookEntry> {
  const { data, error } = await supabase
    .from('gradebook_entries')
    .upsert(
      {
        tenant_id: entry.tenant_id,
        student_id: entry.student_id,
        course_id: entry.course_id,
        assignment_id: entry.assignment_id,
        quiz_id: entry.quiz_id,
        score: entry.score,
        max_score: entry.max_score,
        grade_letter: entry.grade_letter,
        notes: entry.notes,
        graded_by: entry.graded_by,
        graded_at: entry.graded_at,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'tenant_id,student_id,course_id,assignment_id,quiz_id',
      }
    )
    .select(
      `id, tenant_id, student_id, course_id, assignment_id, quiz_id,
       score, max_score, percentage, grade_letter, notes,
       graded_by, graded_at, created_at, updated_at`
    )
    .single()

  if (error) throw error

  return data as unknown as GradebookEntry
}

// ── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Memanggil RPC sync_gradebook_entries untuk menyalin nilai dari quiz_attempts
 * ke gradebook_entries. Mengembalikan jumlah baris yang di-upsert.
 */
export async function syncGradebook(courseId: string, tenantId: string): Promise<number> {
  const { data, error } = await supabase.rpc('sync_gradebook_entries', {
    p_course_id: courseId,
    p_tenant_id: tenantId,
  })

  if (error) throw error

  return (data as number) ?? 0
}

// ── Settings ─────────────────────────────────────────────────────────────────

/**
 * Mengambil pengaturan gradebook untuk satu kursus.
 * Mengembalikan null jika belum dikonfigurasi.
 */
export async function fetchGradebookSettings(
  courseId: string,
  tenantId: string
): Promise<GradebookSettings | null> {
  const { data, error } = await supabase
    .from('gradebook_settings')
    .select(`id, tenant_id, course_id, grading_scale, weight_quizzes, weight_assignments`)
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error

  return (data as GradebookSettings | null) ?? null
}

/**
 * Menyimpan (insert atau update) pengaturan gradebook untuk satu kursus.
 */
export async function upsertGradebookSettings(
  settings: Omit<GradebookSettings, 'id'>
): Promise<GradebookSettings> {
  const { data, error } = await supabase
    .from('gradebook_settings')
    .upsert(settings, { onConflict: 'tenant_id,course_id' })
    .select(`id, tenant_id, course_id, grading_scale, weight_quizzes, weight_assignments`)
    .single()

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

  // PERFORMANCE: Pre-compute column header string keys outside the inner loop to
  // avoid allocating new template literal strings repeatedly for every student.
  const colHeaders = columns.map((col) => ({
    id: col.id,
    title: col.title,
    maxScore: col.max_score,
    maxScoreLabel: `${col.title} (Maks)`,
    pctLabel: `${col.title} (%)`,
    letterLabel: `${col.title} (Huruf)`,
  }))

  for (const [, student] of studentMap) {
    const row: Record<string, string | number> = {
      Nama: student.name,
      Email: student.email,
    }

    let totalPct = 0
    let gradedCount = 0

    for (const col of colHeaders) {
      const entry = student.grades[col.id] ?? null
      if (entry && entry.score !== null) {
        row[col.title] = entry.score
        row[col.maxScoreLabel] = col.maxScore
        row[col.pctLabel] = Number(entry.percentage.toFixed(1))
        row[col.letterLabel] = entry.grade_letter ?? '-'
        totalPct += entry.percentage
        gradedCount++
      } else {
        row[col.title] = '-'
        row[col.maxScoreLabel] = col.maxScore
        row[col.pctLabel] = '-'
        row[col.letterLabel] = '-'
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
