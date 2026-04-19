// ==========================================================================
// Analytics Queries — analyticsQueries.ts
//
// Individual RPC/query functions for analytics data retrieval.
// Extracted from analyticsService.ts for modularity.
// ==========================================================================

import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import type {
  ActivityTimePoint,
  CourseAnalytics,
  CourseEngagement,
  CourseStatsRow,
  EngagementSummaryRow,
  EngagementTrendPoint,
  FunnelDefinition,
  FunnelStepResult,
  LearningPath,
  LessonAnalytics,
  PredictionDetail,
  PredictionSummary,
  RetentionRow,
  StudentPathStep,
  StudentPrediction,
  StudentSignal,
  TeacherAnalyticsData,
} from "../types";
import { parseRpcError } from "./analyticsAggregation";

// ── Core Teacher Analytics ─────────────────────────────────────

/**
 * Refreshes the pre-aggregated course_stats.
 */
export async function refreshCourseStats(
  courseId: string,
  tenantId: string,
): Promise<void> {
  const { error } = await db.rpc("refresh_course_stats", {
    p_course_id: courseId,
    p_tenant_id: tenantId,
  });

  if (error) {
    if (import.meta.env.DEV)
      logger.error("Failed to refresh course stats:", error);
    throw parseRpcError(error);
  }
}

/**
 * Fetches the complete analytics dashboard JSON from the RPC.
 */
export async function getTeacherAnalytics(
  courseId: string,
  tenantId: string,
): Promise<TeacherAnalyticsData | null> {
  const { data, error } = await db.rpc("get_teacher_analytics", {
    p_course_id: courseId,
    p_tenant_id: tenantId,
  });

  if (error) {
    if (import.meta.env.DEV)
      logger.error("Failed to get teacher analytics:", error);
    throw parseRpcError(error);
  }

  return data as TeacherAnalyticsData | null;
}

/**
 * Refresh all course stats (admin only)
 */
export async function refreshAllCourseStats(tenantId: string): Promise<void> {
  const { error } = await db.rpc("refresh_all_course_stats", {
    p_tenant_id: tenantId,
  });

  if (error) {
    if (import.meta.env.DEV)
      logger.error("Failed to refresh all course stats:", error);
    throw parseRpcError(error);
  }
}

/**
 * Fetches tenant-level course_stats rows for aggregation.
 */
export async function fetchTenantCourseStats(
  tenantId: string,
): Promise<CourseStatsRow[]> {
  // NOTE: 'last_refreshed_at' column removed — does not exist in current schema.
  const { data, error } = await db
    .from<any>("course_stats")
    .select(
      "course_id, tenant_id, total_enrolled, active_students, avg_progress, avg_quiz_score",
    )
    .eq("tenant_id", tenantId);

  if (error) {
    if (import.meta.env.DEV)
      logger.error("Failed to get tenant analytics overview:", error);
    throw new Error("Gagal memuat ringkasan analitik. Silakan coba lagi.");
  }

  return (data as CourseStatsRow[]) || [];
}

// ── Activity Metrics ───────────────────────────────────────────

/**
 * Fetches activity event counts by type from RPC.
 */
export async function fetchActivityCounts(
  tenantId: string,
  days: number,
): Promise<{ event_type: string; count: number }[]> {
  const { data, error } = await db.rpc("get_tenant_activity_counts", {
    p_tenant_id: tenantId,
    p_days: days,
  });

  if (error) {
    // The RPC may not exist on all environments — return empty gracefully.
    if (import.meta.env.DEV)
      logger.warn("get_tenant_activity_counts unavailable:", error.message);
    return [];
  }

  return (data as { event_type: string; count: number }[]) || [];
}

/**
 * Fetches course engagement data via RPC.
 */
export async function fetchCourseEngagement(
  tenantId: string,
): Promise<CourseEngagement[]> {
  const { data, error } = (await db.rpc("get_course_engagement", {
    p_tenant_id: tenantId,
  })) as {
    data: Array<{
      course_id: string;
      course_name: string;
      total_enrolled: number;
      active_students: number;
      avg_progress: number;
      avg_quiz_score: number;
    }>;
    error: Error | null;
  };
  if (error) {
    if (import.meta.env.DEV)
      logger.error("Failed to get course engagement stats:", error);
    throw new Error("Gagal memuat data engagement kursus. Silakan coba lagi.");
  }
  return (data || []).map(
    (r: {
      course_id: string;
      course_name: string;
      total_enrolled: number;
      active_students: number;
      avg_progress: number;
      avg_quiz_score: number;
    }) => ({
      courseId: r.course_id,
      courseName: r.course_name,
      enrolled: r.total_enrolled,
      activeStudents: r.active_students,
      avgProgress: r.avg_progress,
      avgQuizScore: r.avg_quiz_score,
    }),
  );
}

/**
 * Fetches activity timeline data for charts via RPC.
 */
export async function fetchActivityTimeline(
  tenantId: string,
  days: number,
): Promise<ActivityTimePoint[]> {
  // Cap days to a safe range to prevent excessive DB load
  const safeDays = Math.min(Math.max(1, days), 365);
  const { data, error } = (await db.rpc("get_activity_timeline", {
    p_tenant_id: tenantId,
    p_days: safeDays,
  })) as {
    data: Array<{
      date: string;
      lesson_views: number;
      assignment_submissions: number;
      quiz_attempts: number;
    }>;
    error: Error | null;
  };

  if (error) {
    if (import.meta.env.DEV)
      logger.error("Failed to get activity timeline:", error);
    throw new Error("Gagal memuat timeline aktivitas. Silakan coba lagi.");
  }

  const dataArray = (
    data as Array<{
      date: string;
      lesson_views: number;
      assignment_submissions: number;
      quiz_attempts: number;
    }>
  ).filter(Boolean);

  const dataMap = new Map(
    dataArray.map<
      [
        string,
        {
          event_date: string;
          lesson_completions: number;
          quiz_attempts: number;
          assignment_submissions: number;
        },
      ]
    >((r) => [
      r.date,
      {
        event_date: r.date,
        lesson_completions: r.lesson_views,
        quiz_attempts: r.quiz_attempts,
        assignment_submissions: r.assignment_submissions,
      },
    ]),
  );

  // Fill all days in range (including those with no events)
  const result: ActivityTimePoint[] = [];
  const today = new Date();
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const row = dataMap.get(key);
    result.push({
      date: key,
      lessonCompletions: Number(row?.lesson_completions ?? 0),
      quizAttempts: Number(row?.quiz_attempts ?? 0),
      assignmentSubmissions: Number(row?.assignment_submissions ?? 0),
    });
  }

  return result;
}

// ── SP-12.3: Dashboard RPC methods ─────────────────────────────

export async function getCourseAnalyticsDashboard(
  courseId: string,
  tenantId: string,
): Promise<CourseAnalytics | null> {
  const { data, error } = await db.rpc("get_course_analytics", {
    p_course_id: courseId,
    p_tenant_id: tenantId,
  });
  if (error) throw parseRpcError(error);
  return (data as CourseAnalytics[])?.[0] ?? null;
}

export async function getLessonAnalyticsDashboard(
  courseId: string,
  tenantId: string,
): Promise<LessonAnalytics[]> {
  const { data, error } = await db.rpc("get_lesson_analytics", {
    p_course_id: courseId,
    p_tenant_id: tenantId,
  });
  if (error) throw parseRpcError(error);
  return (data as LessonAnalytics[]) ?? [];
}

export async function getStudentSignalsDashboard(
  courseId: string,
  tenantId: string,
  lessonId?: string,
): Promise<StudentSignal[]> {
  const { data, error } = await db.rpc("get_student_signals", {
    p_course_id: courseId,
    p_tenant_id: tenantId,
    p_lesson_id: lessonId ?? null,
  });
  if (error) throw parseRpcError(error);
  return (data as StudentSignal[]) ?? [];
}

// ── SP-14: Funnel Analysis ─────────────────────────────────────

export async function saveFunnelDefinition(
  name: string,
  steps: string[],
  courseId?: string,
  funnelId?: string,
): Promise<string> {
  const { data, error } = await db.rpc("save_funnel_definition", {
    p_name: name,
    p_steps: steps,
    p_course_id: courseId ?? null,
    p_funnel_id: funnelId ?? null,
  });
  if (error) throw parseRpcError(error);
  return data as string;
}

export async function listFunnelDefinitions(
  courseId?: string,
): Promise<FunnelDefinition[]> {
  const { data, error } = await db.rpc("list_funnel_definitions", {
    p_course_id: courseId ?? null,
  });
  if (error) throw parseRpcError(error);
  return ((data as Array<Record<string, unknown>>) ?? []).map((r) => ({
    ...r,
    steps: Array.isArray(r.steps)
      ? r.steps
      : (() => {
          try {
            return JSON.parse(r.steps as string);
          } catch {
            if (import.meta.env.DEV)
              logger.warn("[Analytics] Invalid funnel steps JSON:", r.steps);
            return [];
          }
        })(),
  })) as unknown as FunnelDefinition[];
}

export async function deleteFunnelDefinition(funnelId: string): Promise<void> {
  const { error } = await db.rpc("delete_funnel_definition", {
    p_funnel_id: funnelId,
  });
  if (error) throw parseRpcError(error);
}

export async function getFunnelResults(
  funnelId: string,
): Promise<FunnelStepResult[]> {
  const { data, error } = await db.rpc("get_funnel_results", {
    p_funnel_id: funnelId,
  });
  if (error) throw parseRpcError(error);
  return (data as FunnelStepResult[]) ?? [];
}

// ── SP-15: Retention & Cohort ──────────────────────────────────

export async function getRetentionMatrix(
  courseId: string,
  weeksBack: number = 8,
): Promise<RetentionRow[]> {
  const { data, error } = await db.rpc("get_retention_matrix", {
    p_course_id: courseId,
    p_weeks_back: weeksBack,
  });
  if (error) throw parseRpcError(error);
  return (data as RetentionRow[]) ?? [];
}

// ── SP-16: Engagement Scoring ──────────────────────────────────

export async function getEngagementSummary(
  courseId: string,
): Promise<EngagementSummaryRow[]> {
  const { data, error } = await db.rpc("get_engagement_summary", {
    p_course_id: courseId,
  });
  if (error) throw parseRpcError(error);
  return (data as EngagementSummaryRow[]) ?? [];
}

export async function getEngagementTrend(
  courseId: string,
  days: number = 30,
): Promise<EngagementTrendPoint[]> {
  const { data, error } = await db.rpc("get_engagement_trend", {
    p_course_id: courseId,
    p_days: days,
  });
  if (error) throw parseRpcError(error);
  return (data as EngagementTrendPoint[]) ?? [];
}

// ── SP-17: Learning Path Analysis ──────────────────────────────

export async function getLearningPaths(
  courseId: string,
  minUsers: number = 1,
): Promise<LearningPath[]> {
  const { data, error } = await db.rpc("get_learning_paths", {
    p_course_id: courseId,
    p_min_users: minUsers,
  });
  if (error) throw parseRpcError(error);
  return (data as LearningPath[]) ?? [];
}

export async function getStudentPath(
  userId: string,
  courseId: string,
): Promise<StudentPathStep[]> {
  const { data, error } = await db.rpc("get_student_path", {
    p_user_id: userId,
    p_course_id: courseId,
  });
  if (error) throw parseRpcError(error);
  return (data as StudentPathStep[]) ?? [];
}

// ── SP-19: Predictive Analytics ────────────────────────────────

export async function getAtRiskStudents(
  courseId: string,
  minRisk: number = 0.3,
): Promise<StudentPrediction[]> {
  const { data, error } = await db.rpc("get_at_risk_students", {
    p_course_id: courseId,
    p_min_risk: minRisk,
  });
  if (error) throw parseRpcError(error);
  return (data as StudentPrediction[]) ?? [];
}

export async function getStudentPrediction(
  userId: string,
  courseId: string,
): Promise<PredictionDetail | null> {
  const { data, error } = await db.rpc("get_student_prediction", {
    p_user_id: userId,
    p_course_id: courseId,
  });
  if (error) throw parseRpcError(error);
  return ((data as PredictionDetail[]) ?? [])[0] ?? null;
}

export async function getPredictionSummary(
  courseId: string,
): Promise<PredictionSummary | null> {
  const { data, error } = await db.rpc("get_prediction_summary", {
    p_course_id: courseId,
  });
  if (error) throw parseRpcError(error);
  return ((data as PredictionSummary[]) ?? [])[0] ?? null;
}

// ── Live Activity Feed ───────────────────────────────────────────────────

export interface LiveEvent {
  id: string;
  user_id: string;
  event_type: string;
  lesson_id?: string;
  course_id?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
  student_name?: string;
  lesson_title?: string;
}

/**
 * Fetch the latest learning events for a tenant (used by LiveActivityFeed).
 */
export async function fetchLatestEvents(
  tenantId: string,
  limit = 10,
): Promise<LiveEvent[]> {
  const { data, error } = await db
    .from<any>("learning_events")
    .select(
      "id, user_id, event_type, lesson_id, course_id, created_at, metadata",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (import.meta.env.DEV) logger.error("Failed to fetch live events", error);
    throw error;
  }

  return (data ?? []) as LiveEvent[];
}
