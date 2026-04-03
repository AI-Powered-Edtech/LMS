// ==========================================================================
// Executive API — executiveApi.ts
//
// Supabase queries for Principal Executive Dashboard.
// ==========================================================================

import { supabase } from '@/services/supabase/client'

import type {
  ExecutiveOverview,
  MonthlyTrend,
  PrincipalSettings,
  ROIMetrics,
  SchoolBaselineMetrics,
} from '../types'

// ── Executive Overview ─────────────────────────────────────────

/**
 * Calls the get_executive_overview() RPC created in Wave 3.
 */
export async function getExecutiveOverview(tenantId: string): Promise<ExecutiveOverview> {
  const { data, error } = await supabase.rpc('get_executive_overview', {
    p_tenant_id: tenantId,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Principal] get_executive_overview error:', error)
    throw new Error('Gagal memuat ringkasan eksekutif. Silakan coba lagi.')
  }

  // RPC returns a single row
  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    // Return safe defaults if no data
    return {
      total_students: 0,
      active_students: 0,
      total_teachers: 0,
      active_teachers: 0,
      total_courses: 0,
      avg_quiz_score: 0,
      adoption_rate: 0,
    }
  }

  return {
    total_students: Number(row.total_students ?? 0),
    active_students: Number(row.active_students ?? 0),
    total_teachers: Number(row.total_teachers ?? 0),
    active_teachers: Number(row.active_teachers ?? 0),
    total_courses: Number(row.total_courses ?? 0),
    avg_quiz_score: Number(row.avg_quiz_score ?? 0),
    adoption_rate: Number(row.adoption_rate ?? 0),
  }
}

// ── Monthly Trend ──────────────────────────────────────────────

/**
 * Aggregates monthly activity from activity_events for the last N months.
 */
export async function getMonthlyTrend(
  tenantId: string,
  months: number = 6
): Promise<MonthlyTrend[]> {
  // Calculate date range
  const now = new Date()
  const since = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

  const { data, error } = await supabase.rpc('get_activity_timeline', {
    p_tenant_id: tenantId,
    p_days: months * 30,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Principal] getMonthlyTrend error:', error)
    // Return empty array instead of throwing — graceful degradation
    return []
  }

  // Aggregate daily data into monthly buckets
  const monthlyMap = new Map<string, MonthlyTrend>()

  // Pre-populate months
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
    monthlyMap.set(key, {
      month: key,
      active_students: 0,
      lesson_completions: 0,
      quiz_attempts: 0,
    })
  }

  // Aggregate from timeline data
  if (Array.isArray(data)) {
    for (const row of data) {
      const date = new Date(row.event_date ?? row.date)
      if (date < since) continue
      const key = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
      const existing = monthlyMap.get(key)
      if (existing) {
        existing.lesson_completions += Number(row.lesson_completions ?? 0)
        existing.quiz_attempts += Number(row.quiz_attempts ?? 0)
        // Active students: we'll approximate as lesson_completions / average completions
        existing.active_students = Math.max(
          existing.active_students,
          Number(row.lesson_completions ?? 0)
        )
      }
    }
  }

  return Array.from(monthlyMap.values())
}

// ── Principal Settings ─────────────────────────────────────────

export async function getPrincipalSettings(tenantId: string): Promise<PrincipalSettings | null> {
  const { data, error } = await supabase
    .from('principal_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    if (import.meta.env.DEV) console.error('[Principal] getPrincipalSettings error:', error)
    return null
  }

  return data as PrincipalSettings | null
}

export async function updatePrincipalSettings(
  tenantId: string,
  settings: Partial<PrincipalSettings>
): Promise<void> {
  const { error } = await supabase
    .from('principal_settings')
    .upsert(
      { ...settings, tenant_id: tenantId, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id' }
    )

  if (error) {
    if (import.meta.env.DEV) console.error('[Principal] updatePrincipalSettings error:', error)
    throw new Error('Gagal menyimpan pengaturan. Silakan coba lagi.')
  }
}

// ── ROI Metrics ────────────────────────────────────────────────

/**
 * Calculate ROI metrics based on usage data.
 * Formula:
 *  - paper_saved_sheets = quiz_attempts * 2 + lesson_completions * 1
 *  - paper_saved_cost = sheets * Rp 500
 *  - teacher_time_saved_hours = graded_assignments * 10 min / 60
 *  - digital_adoption_score = adoption_rate (0-100)
 */
export async function getROIMetrics(tenantId: string): Promise<ROIMetrics> {
  // Fetch activity counts for the last 30 days
  const { data, error } = await supabase.rpc('get_tenant_activity_counts', {
    p_tenant_id: tenantId,
    p_days: 30,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Principal] getROIMetrics error:', error)
    return {
      paper_saved_sheets: 0,
      paper_saved_cost: 0,
      teacher_time_saved_hours: 0,
      digital_adoption_score: 0,
    }
  }

  const counts = (data as { event_type: string; count: number }[]) ?? []

  const lessonCompletions = counts.find((c) => c.event_type === 'LESSON_COMPLETED')?.count ?? 0
  const quizAttempts = counts.find((c) => c.event_type === 'QUIZ_SUBMITTED')?.count ?? 0
  const assignmentsGraded = counts.find((c) => c.event_type === 'ASSIGNMENT_GRADED')?.count ?? 0

  const paperSavedSheets = quizAttempts * 2 + lessonCompletions * 1
  const paperSavedCost = paperSavedSheets * 500
  const teacherTimeSavedHours = (assignmentsGraded * 10) / 60

  // Get adoption rate from executive overview
  let adoptionScore = 0
  try {
    const overview = await getExecutiveOverview(tenantId)
    adoptionScore = overview.adoption_rate
  } catch {
    adoptionScore = 0
  }

  return {
    paper_saved_sheets: paperSavedSheets,
    paper_saved_cost: paperSavedCost,
    teacher_time_saved_hours: Math.round(teacherTimeSavedHours * 10) / 10,
    digital_adoption_score: adoptionScore,
  }
}

// ── Baseline Metrics ───────────────────────────────────────────

/**
 * Fetch baseline metrics (data "sebelum LMS") dari school_baseline_metrics.
 */
export async function getBaselineMetrics(tenantId: string): Promise<SchoolBaselineMetrics | null> {
  const { data, error } = await supabase
    .from('school_baseline_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    if (import.meta.env.DEV) console.error('[Principal] getBaselineMetrics error:', error)
    return null
  }

  return data as SchoolBaselineMetrics | null
}

/**
 * Upsert baseline metrics — simpan data "sebelum LMS".
 */
export async function saveBaselineMetrics(
  tenantId: string,
  data: Omit<SchoolBaselineMetrics, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<void> {
  const { error } = await supabase
    .from('school_baseline_metrics')
    .upsert(
      { ...data, tenant_id: tenantId, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id' }
    )

  if (error) {
    if (import.meta.env.DEV) console.error('[Principal] saveBaselineMetrics error:', error)
    throw new Error('Gagal menyimpan data baseline. Silakan coba lagi.')
  }
}
