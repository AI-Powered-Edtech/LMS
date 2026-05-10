// ==========================================================================
// Executive API — executiveApi.ts
//
// Query API for Principal Executive Dashboard.
// ==========================================================================
import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import type {
  ExecutiveOverview,
  MonthlyTrend,
  PrincipalSettings,
  ROIMetrics,
  SchoolBaselineMetrics,
} from "../types";

// ── Executive Overview ─────────────────────────────────────────

/**
 * Tries the cached materialized view first (get_principal_overview_cached),
 * then falls back to the real-time RPC (get_executive_overview) on any error.
 *
 * The cached path is significantly faster (~1 ms vs ~200 ms) because it reads
 * from mv_principal_overview which is refreshed every 15 minutes by pg_cron.
 *
 * The returned shape is identical to ExecutiveOverview so callers need no changes.
 * An extra `from_cache` boolean is included for debug / staleness indicators.
 */
export async function getExecutiveOverviewCached(
  tenantId: string,
): Promise<ExecutiveOverview & { from_cache: boolean }> {
  const { data: cached, error: cachedError } = await db.rpc(
    "get_principal_overview_cached",
    {
      p_tenant_id: tenantId,
    },
  );

  if (!cachedError && cached && (cached as unknown[]).length > 0) {
    const row = (cached as Record<string, unknown>[])[0];
    return {
      total_students: Number(row.total_students ?? 0),
      active_students: Number(row.active_students ?? 0),
      total_teachers: Number(row.total_teachers ?? 0),
      active_teachers: Number(row.active_teachers ?? 0),
      total_courses: Number(row.total_courses ?? 0),
      avg_quiz_score: Number(row.avg_quiz_score ?? 0),
      adoption_rate: Number(row.adoption_rate ?? 0),
      from_cache: true,
    };
  }

  if (import.meta.env.DEV && cachedError) {
    logger.warn(
      "[Principal] get_principal_overview_cached miss — falling back:",
      cachedError,
    );
  }

  // Fallback to real-time RPC
  const realtime = await getExecutiveOverview(tenantId);
  return { ...realtime, from_cache: false };
}

/**
 * Calls the get_executive_overview() RPC created in Wave 3.
 */
export async function getExecutiveOverview(
  tenantId: string,
): Promise<ExecutiveOverview> {
  const { data, error } = await db.rpc("get_executive_overview", {
    p_tenant_id: tenantId,
  });

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Principal] get_executive_overview error:", error);
    throw new Error("Gagal memuat ringkasan eksekutif. Silakan coba lagi.");
  }

  // RPC returns a single row
  const row = Array.isArray(data) ? data[0] : data;
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
    };
  }

  return {
    total_students: Number(row.total_students ?? 0),
    active_students: Number(row.active_students ?? 0),
    total_teachers: Number(row.total_teachers ?? 0),
    active_teachers: Number(row.active_teachers ?? 0),
    total_courses: Number(row.total_courses ?? 0),
    avg_quiz_score: Number(row.avg_quiz_score ?? 0),
    adoption_rate: Number(row.adoption_rate ?? 0),
  };
}

// ── Monthly Trend ──────────────────────────────────────────────

/**
 * Aggregates monthly activity from activity_events for the last N months.
 */
export async function getMonthlyTrend(
  tenantId: string,
  months: number = 6,
): Promise<MonthlyTrend[]> {
  const { data, error } = await db.rpc("get_principal_monthly_trend_cached", {
    p_tenant_id: tenantId,
    p_months: months,
  });

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Principal] getMonthlyTrend error:", error);
    // Return empty array instead of throwing — graceful degradation
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    month: String(row.month_label ?? row.month_key ?? ""),
    active_students: Number(row.active_students ?? 0),
    lesson_completions: Number(row.lesson_completions ?? 0),
    quiz_attempts: Number(row.quiz_attempts ?? 0),
  }));
}

// ── Principal Settings ─────────────────────────────────────────

export async function getPrincipalSettings(
  tenantId: string,
): Promise<PrincipalSettings | null> {
  const { data, error } = await db
    .from("principal_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Principal] getPrincipalSettings error:", error);
    return null;
  }

  return data as PrincipalSettings | null;
}

export async function updatePrincipalSettings(
  tenantId: string,
  settings: Partial<PrincipalSettings>,
): Promise<void> {
  const { error } = await db
    .from("principal_settings")
    .upsert(
      {
        ...settings,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Principal] updatePrincipalSettings error:", error);
    throw new Error("Gagal menyimpan pengaturan. Silakan coba lagi.");
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
  const { data, error } = await db.rpc("get_tenant_activity_counts", {
    p_tenant_id: tenantId,
    p_days: 30,
  });

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Principal] getROIMetrics error:", error);
    return {
      paper_saved_sheets: 0,
      paper_saved_cost: 0,
      teacher_time_saved_hours: 0,
      digital_adoption_score: 0,
    };
  }

  const counts = (data as { event_type: string; count: number }[]) ?? [];

  const lessonCompletions =
    counts.find((c) => c.event_type === "LESSON_COMPLETED")?.count ?? 0;
  const quizAttempts =
    counts.find((c) => c.event_type === "QUIZ_SUBMITTED")?.count ?? 0;
  const assignmentsGraded =
    counts.find((c) => c.event_type === "ASSIGNMENT_GRADED")?.count ?? 0;

  const paperSavedSheets = quizAttempts * 2 + lessonCompletions * 1;
  const paperSavedCost = paperSavedSheets * 500;
  const teacherTimeSavedHours = (assignmentsGraded * 10) / 60;

  // Get adoption rate from executive overview
  let adoptionScore = 0;
  try {
    const overview = await getExecutiveOverview(tenantId);
    adoptionScore = overview.adoption_rate;
  } catch {
    adoptionScore = 0;
  }

  return {
    paper_saved_sheets: paperSavedSheets,
    paper_saved_cost: paperSavedCost,
    teacher_time_saved_hours: Math.round(teacherTimeSavedHours * 10) / 10,
    digital_adoption_score: adoptionScore,
  };
}

// ── Baseline Metrics ───────────────────────────────────────────

/**
 * Fetch baseline metrics (data "sebelum LMS") dari school_baseline_metrics.
 */
export async function getBaselineMetrics(
  tenantId: string,
): Promise<SchoolBaselineMetrics | null> {
  const { data, error } = await db
    .from("school_baseline_metrics")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Principal] getBaselineMetrics error:", error);
    return null;
  }

  return data as SchoolBaselineMetrics | null;
}

/**
 * Upsert baseline metrics — simpan data "sebelum LMS".
 */
export async function saveBaselineMetrics(
  tenantId: string,
  data: Omit<
    SchoolBaselineMetrics,
    "id" | "tenant_id" | "created_at" | "updated_at"
  >,
): Promise<void> {
  const { error } = await db
    .from("school_baseline_metrics")
    .upsert(
      { ...data, tenant_id: tenantId, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Principal] saveBaselineMetrics error:", error);
    throw new Error("Gagal menyimpan data baseline. Silakan coba lagi.");
  }
}
