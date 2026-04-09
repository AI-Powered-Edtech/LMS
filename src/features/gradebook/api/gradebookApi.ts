import Papa from 'papaparse'

import { supabase } from '@/services/supabase/client'

import type { GradebookColumn, GradebookEntry, GradebookSettings } from '../types'

// ── Legacy Compatibility Types ───────────────────────────────────────────────

export type GradeStatus = 'ungraded' | 'graded' | 'needs_revision'

export interface GradebookAssignment {
  id: string
  title: string
  type: 'quiz' | 'assignment' | 'project' | 'exam' | 'presentation' | 'offline'
  maxScore: number
  date: string
}

export interface GradeEntry {
  score: number | null
  status: GradeStatus
  feedback?: string
  source?: 'assignment' | 'quiz'
}

export type GradeData = Record<string, Record<string, GradeEntry>>

export interface GradebookStudent {
  id: string
  name: string
  nis: string
  avatarSeed?: string
}

export interface GradebookData {
  assignments: GradebookAssignment[]
  students: GradebookStudent[]
  grades: GradeData
}

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Mengambil semua entri gradebook untuk satu kursus, termasuk nama siswa,
 * judul tugas/kuis, dan tipe item (quiz|assignment).
 */
export async function fetchGradebookEntries(
  courseId: string,
  tenantId: string
): Promise<GradebookEntry[]> {
  // NOTE: gradebook_entries uses entity_type/entity_id pattern, NOT assignment_id/quiz_id.
  // Columns: id, tenant_id, course_id, student_id, entity_type, entity_id, score, max_score,
  //          feedback, graded_by, graded_at, created_at, updated_at
  const { data, error } = await supabase
    .from('gradebook_entries')
    .select(
      `id, tenant_id, student_id, course_id, entity_type, entity_id,
       score, max_score, feedback, graded_by, graded_at, created_at, updated_at, title,
       profiles:student_id (full_name, email)`
    )
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .neq('student_id', '00000000-0000-0000-0000-000000000001')
    .order('created_at', { ascending: true })

  if (error) throw error

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const profile = row.profiles as { full_name: string; email: string } | null
    const entityType = row.entity_type as string
    const itemType: 'quiz' | 'assignment' | undefined =
      entityType === 'quiz' ? 'quiz' : entityType === 'assignment' ? 'assignment' : undefined
    const score = Number(row.score ?? 0)
    const maxScore = Number(row.max_score ?? 0)
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      student_id: row.student_id as string,
      course_id: row.course_id as string,
      assignment_id: entityType === 'assignment' ? (row.entity_id as string) : null,
      quiz_id: entityType === 'quiz' ? (row.entity_id as string) : null,
      score,
      max_score: maxScore,
      percentage,
      grade_letter: null,
      notes: (row.feedback as string | null) ?? null,
      graded_by: (row.graded_by as string | null) ?? null,
      graded_at: (row.graded_at as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      student_name: profile?.full_name ?? undefined,
      student_email: profile?.email ?? undefined,
      item_title: (row.title as string | null) ?? undefined,
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
  updates: Partial<Pick<GradebookEntry, 'score' | 'notes'>>
): Promise<GradebookEntry> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.score !== undefined) dbUpdates.score = updates.score
  if (updates.notes !== undefined) dbUpdates.feedback = updates.notes // DB column is 'feedback'

  const { data, error } = await supabase
    .from('gradebook_entries')
    .update(dbUpdates)
    .eq('id', id)
    .select(
      `id, tenant_id, student_id, course_id, entity_type, entity_id,
       score, max_score, feedback, graded_by, graded_at, created_at, updated_at`
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
  entry: Pick<
    GradebookEntry,
    | 'tenant_id'
    | 'student_id'
    | 'course_id'
    | 'assignment_id'
    | 'quiz_id'
    | 'score'
    | 'max_score'
    | 'notes'
    | 'graded_by'
    | 'graded_at'
  >
): Promise<GradebookEntry> {
  const entityType = entry.quiz_id ? 'quiz' : 'assignment'
  const entityId = entry.quiz_id ?? entry.assignment_id

  const { data, error } = await supabase
    .from('gradebook_entries')
    .upsert(
      {
        tenant_id: entry.tenant_id,
        student_id: entry.student_id,
        course_id: entry.course_id,
        entity_type: entityType,
        entity_id: entityId,
        score: entry.score,
        max_score: entry.max_score,
        feedback: entry.notes,
        graded_by: entry.graded_by,
        graded_at: entry.graded_at,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'tenant_id,student_id,course_id,entity_type,entity_id',
      }
    )
    .select(
      `id, tenant_id, student_id, course_id, entity_type, entity_id,
       score, max_score, feedback, graded_by, graded_at, created_at, updated_at`
    )
    .single()

  if (error) throw error

  return data as unknown as GradebookEntry
}

// ── Add gradebook item (column definition) ────────────────────────────────────

// Sentinel UUID used as student_id for gradebook column-definition rows.
// Kept for backward compatibility with existing sentinel rows in gradebook_entries.
const COLUMN_DEFINITION_SENTINEL = '00000000-0000-0000-0000-000000000001'

/**
 * Persists a new gradebook column (assignment/quiz/manual item) to the database.
 * Writes to the dedicated `gradebook_columns` table (Phase 31).
 * Also creates a sentinel row in gradebook_entries for backward compatibility
 * with components that derive columns from entries.
 */
export async function addGradebookItem(data: {
  courseId: string
  tenantId: string
  title: string
  entityType: 'assignment' | 'quiz' | 'manual'
  maxScore: number
}): Promise<{ id: string; title: string; entityType: string; maxScore: number }> {
  const newEntityId = crypto.randomUUID()

  // Determine the next order value for this course
  const { data: existingColumns } = await supabase
    .from('gradebook_columns')
    .select('order')
    .eq('course_id', data.courseId)
    .eq('tenant_id', data.tenantId)
    .order('order', { ascending: false })
    .limit(1)

  const latestOrderRaw =
    existingColumns && existingColumns.length > 0
      ? (existingColumns[0] as Record<string, unknown>).order
      : null
  const latestOrder =
    typeof latestOrderRaw === 'number'
      ? latestOrderRaw
      : typeof latestOrderRaw === 'string'
        ? Number(latestOrderRaw)
        : Number.NaN
  const nextOrder = Number.isFinite(latestOrder) ? latestOrder + 1 : 0

  // Insert into the dedicated gradebook_columns table
  const { error: columnError } = await supabase.from('gradebook_columns').insert({
    course_id: data.courseId,
    tenant_id: data.tenantId,
    name: data.title,
    type: data.entityType,
    weight: 1.0,
    order: nextOrder,
  })

  if (columnError && import.meta.env.DEV) {
    console.warn(
      '[Gradebook] gradebook_columns insert failed (falling back to sentinel):',
      columnError
    )
  }

  // Also create a sentinel row in gradebook_entries for backward compatibility
  // with components that derive columns from entries (GradebookTable.buildColumns).
  const { data: result, error } = await supabase
    .from('gradebook_entries')
    .insert({
      course_id: data.courseId,
      tenant_id: data.tenantId,
      student_id: COLUMN_DEFINITION_SENTINEL,
      entity_type: data.entityType,
      entity_id: newEntityId,
      score: 0,
      max_score: data.maxScore,
      title: data.title,
    })
    .select('id, entity_type, entity_id, max_score')
    .single()

  if (error) throw error

  return {
    id: newEntityId,
    title: data.title,
    entityType: (result as Record<string, unknown>).entity_type as string,
    maxScore: Number((result as Record<string, unknown>).max_score),
  }
}

// ── Column definitions ────────────────────────────────────────────────────────

/**
 * Fetches column definitions for a course from the gradebook_columns table.
 * Falls back to deriving columns from sentinel entries if the table is empty.
 */
export async function fetchGradebookColumns(
  courseId: string,
  tenantId: string
): Promise<GradebookColumn[]> {
  // Try the dedicated table first
  const { data, error } = await supabase
    .from('gradebook_columns')
    .select('id, name, type, weight, order, created_at')
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .order('order', { ascending: true })

  if (error) throw error

  if (data && data.length > 0) {
    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      title: row.name as string,
      type: row.type as 'quiz' | 'assignment',
      max_score: 0, // max_score comes from entries; columns just define structure
    }))
  }

  // Fallback: derive from sentinel entries (backward compat)
  const { data: entries, error: entriesError } = await supabase
    .from('gradebook_entries')
    .select('entity_type, entity_id, title, max_score')
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .eq('student_id', COLUMN_DEFINITION_SENTINEL)
    .order('created_at', { ascending: true })

  if (entriesError) throw entriesError

  const seen = new Map<string, GradebookColumn>()
  for (const row of entries ?? []) {
    const r = row as Record<string, unknown>
    const colId = r.entity_id as string
    if (colId && !seen.has(colId)) {
      seen.set(colId, {
        id: colId,
        title: (r.title as string) ?? colId,
        type: (r.entity_type as 'quiz' | 'assignment') ?? 'assignment',
        max_score: Number(r.max_score ?? 0),
      })
    }
  }
  return Array.from(seen.values())
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

// ── Legacy Compatibility Layer ──────────────────────────────────────────────

/**
 * Legacy-compatible fetchGradebook function that maps modern gradebook_entries
 * to the old interface for backward compatibility during migration.
 */
export async function fetchGradebookLegacy(
  tenantId: string,
  courseId: string,
  _submissionsPage = 0
): Promise<GradebookData> {
  // Fetch modern gradebook data
  const [entriesResult, columnsResult, profilesResult] = await Promise.all([
    fetchGradebookEntries(courseId, tenantId),
    fetchGradebookColumns(courseId, tenantId),
    // Server-side student filtering via RPC
    supabase.rpc('get_gradebook_students', { p_tenant_id: tenantId }),
  ])

  // Transform entries to legacy format
  const grades: GradeData = {}
  const studentMap = new Map<string, { name: string; email: string }>()

  // Process entries and build student map
  for (const entry of entriesResult) {
    if (!grades[entry.student_id]) grades[entry.student_id] = {}

    const itemId = entry.quiz_id || entry.assignment_id
    if (!itemId) continue

    grades[entry.student_id][itemId] = {
      score: entry.score,
      status: entry.score !== null ? 'graded' : 'ungraded',
      feedback: entry.notes || undefined,
      source: entry.quiz_id ? 'quiz' : 'assignment',
    }

    // Store student info
    if (entry.student_name && entry.student_email) {
      studentMap.set(entry.student_id, {
        name: entry.student_name,
        email: entry.student_email,
      })
    }
  }

  // Transform columns to legacy assignments
  const assignments: GradebookAssignment[] = columnsResult.map((col) => ({
    id: col.id,
    title: col.title,
    type: col.type === 'quiz' ? 'quiz' : 'assignment',
    maxScore: col.max_score,
    date: '', // Legacy format doesn't store dates
  }))

  // Transform profiles to legacy students
  const students: GradebookStudent[] = (profilesResult.data ?? []).map(
    (p: { id: string; first_name: string; last_name: string; email: string }) => {
      const profile = studentMap.get(p.id)
      return {
        id: p.id,
        name: profile?.name || `${p.first_name} ${p.last_name}`.trim() || p.email,
        nis: p.email.split('@')[0],
        avatarSeed: p.id,
      }
    }
  )

  return { assignments, students, grades }
}

/**
 * Legacy-compatible submitGrade function that updates gradebook_entries.
 */
export async function submitGradeLegacy(
  itemId: string,
  studentId: string,
  courseId: string,
  score: number,
  feedback: string | undefined,
  tenantId: string
): Promise<void> {
  // Determine if this is a quiz or assignment
  const columns = await fetchGradebookColumns(courseId, tenantId)
  const column = columns.find((col) => col.id === itemId)

  if (!column) {
    throw new Error(`Column ${itemId} not found in gradebook`)
  }

  const entityType = column.type
  const entityId = itemId

  // Upsert the gradebook entry
  await upsertGradebookEntry({
    tenant_id: tenantId,
    student_id: studentId,
    course_id: courseId,
    quiz_id: entityType === 'quiz' ? entityId : null,
    assignment_id: entityType === 'assignment' ? entityId : null,
    score,
    max_score: column.max_score,
    notes: feedback ?? null,
    graded_by: null, // TODO: Get from auth context
    graded_at: new Date().toISOString(),
  })
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
