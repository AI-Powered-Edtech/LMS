/**
 * Class-section adapter — Workstream B2 (light).
 *
 * One unified call site for "list the class-sections this user belongs to /
 * teaches", preferring `rombel` (the new authoritative class-section entity
 * per ADR-002) and falling back to `classes` rows that have no rombel_id
 * mapping yet (legacy course-instances created before migration 069).
 *
 * Consumers should migrate to this helper rather than reading `classes`
 * directly. Existing direct readers stay working — this adapter is additive.
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

/**
 * Returns class-sections visible to the current user via RLS. Order:
 *   1. Rombel rows (authoritative)
 *   2. Classes rows whose `rombel_id IS NULL` (legacy / unmapped)
 *
 * Calls remain best-effort: if either fetch fails the helper logs and
 * returns the rows it has so the page can still render partial data.
 */
export async function listClassSections(): Promise<ClassSection[]> {
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
