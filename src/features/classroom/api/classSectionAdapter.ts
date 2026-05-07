/**
 * Class-section adapter — Workstream B2.
 *
 * Unified call site for class-section operations preferring `rombel` (the new
 * authoritative class-section entity per ADR-002) and falling back to
 * `classes` rows that have no rombel_id mapping yet (legacy course-instances
 * created before migration 069).
 *
 * Feature flag: VITE_USE_ROMBEL_ADAPTER (default: true). Set to "false" to
 * disable rombel-preference for the rollout safety period.
 */

import { db } from '@/services/db'
import { logger } from '@/utils/logger'

export interface ClassSection {
  id: string
  /** Source table this row came from. Useful for telemetry / progressive cutover. */
  source: 'rombel' | 'classes'
  name: string
  code: string | null
  wali_kelas_id: string | null
  student_count: number | null
}

export interface ClassSectionStudent {
  student_id: string
  full_name: string
  email: string | null
}

/**
 * Whether the rombel-preference adapter is enabled. Reads VITE_USE_ROMBEL_ADAPTER
 * lazily so tests can stub it. Defaults to true.
 */
export function isRombelAdapterEnabled(): boolean {
  const env = (import.meta as { env?: Record<string, unknown> }).env ?? {}
  const raw = (env.VITE_USE_ROMBEL_ADAPTER as string | undefined) ?? 'true'
  return raw !== 'false' && raw !== '0'
}

/**
 * Returns class-sections visible to the current user via RLS. Order:
 *   1. Rombel rows (authoritative)
 *   2. Classes rows whose `rombel_id IS NULL` (legacy / unmapped)
 *
 * If the flag is disabled, returns only the legacy classes path.
 *
 * Calls remain best-effort: if either fetch fails the helper logs and returns
 * the rows it has so the page can still render partial data.
 */
export async function listClassSections(): Promise<ClassSection[]> {
  if (!isRombelAdapterEnabled()) {
    return listClassSectionsLegacy()
  }

  const out: ClassSection[] = []

  try {
    const { data, error } = await db
      .from('rombel')
      .select('id, name, code, wali_kelas_id, status')
      .eq('status', 'active')
      .order('code', { ascending: true })

    if (error) throw error
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      out.push({
        id: row.id as string,
        source: 'rombel',
        name: (row.name as string) ?? '',
        code: (row.code as string | null) ?? null,
        wali_kelas_id: (row.wali_kelas_id as string | null) ?? null,
        student_count: null,
      })
    }
  } catch (err) {
    logger.warn('[ClassSectionAdapter] rombel fetch failed; falling back', err)
  }

  try {
    const { data, error } = await db
      .from('classes')
      .select('id, name, teacher_id, rombel_id')
      .is('rombel_id', null)
      .order('name', { ascending: true })

    if (error) throw error
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      out.push({
        id: row.id as string,
        source: 'classes',
        name: (row.name as string) ?? '',
        code: null,
        wali_kelas_id: (row.teacher_id as string | null) ?? null,
        student_count: null,
      })
    }
  } catch (err) {
    logger.warn('[ClassSectionAdapter] classes fallback failed', err)
  }

  return out
}

async function listClassSectionsLegacy(): Promise<ClassSection[]> {
  try {
    const { data, error } = await db
      .from('classes')
      .select('id, name, teacher_id')
      .order('name', { ascending: true })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      source: 'classes' as const,
      name: (row.name as string) ?? '',
      code: null,
      wali_kelas_id: (row.teacher_id as string | null) ?? null,
      student_count: null,
    }))
  } catch (err) {
    logger.warn('[ClassSectionAdapter:legacy] classes fetch failed', err)
    return []
  }
}

/**
 * Fetch student list for a class-section, dispatching by source table:
 *   - source='rombel'  → reads rombel_members + profiles
 *   - source='classes' → reads enrollments + profiles (legacy path)
 *
 * Returns an alphabetically-sorted list of students. Throws on DB error so the
 * caller can show an explicit error state (unlike listClassSections which is
 * best-effort).
 */
export async function getClassSectionStudents(
  section: Pick<ClassSection, 'id' | 'source'>,
): Promise<ClassSectionStudent[]> {
  const memberIds: string[] = []

  if (section.source === 'rombel') {
    const { data, error } = await db
      .from('rombel_members')
      .select('student_id, left_at')
      .eq('rombel_id', section.id)
      .is('left_at', null)
    if (error) throw error
    for (const r of (data ?? []) as Array<{ student_id: string }>) {
      if (r.student_id) memberIds.push(r.student_id)
    }
  } else {
    const { data, error } = await db
      .from('enrollments')
      .select('student_id')
      .eq('class_id', section.id)
      .eq('status', 'ACTIVE')
    if (error) throw error
    for (const r of (data ?? []) as Array<{ student_id: string }>) {
      if (r.student_id) memberIds.push(r.student_id)
    }
  }

  if (memberIds.length === 0) return []

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', memberIds)
  if (error) throw error

  const out: ClassSectionStudent[] = ((profiles ?? []) as Array<{
    id: string
    full_name: string | null
    email: string | null
  }>).map((p) => ({
    student_id: p.id,
    full_name: p.full_name ?? 'Siswa',
    email: p.email,
  }))

  out.sort((a, b) => a.full_name.localeCompare(b.full_name))
  return out
}
