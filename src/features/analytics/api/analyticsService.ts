// ==========================================================================
// Analytics Service — analyticsService.ts
//
// Main service object that orchestrates analytics queries and aggregation.
// Delegates to analyticsQueries.ts and analyticsAggregation.ts.
// All method signatures are preserved for backward compatibility.
// ==========================================================================

import type {
  ActivityMetrics,
  ActivityTimePoint,
  CourseAnalytics,
  CourseEngagement,
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
  TenantAnalyticsData,
  TenantAnalyticsOverview,
} from "../types";
import {
  aggregateActivityMetrics,
  aggregateTenantOverview,
} from "./analyticsAggregation";
import {
  deleteFunnelDefinition,
  fetchActivityCounts,
  fetchActivityTimeline,
  fetchCourseEngagement,
  fetchLatestEvents,
  fetchTenantCourseStats,
  getAtRiskStudents,
  getCourseAnalyticsDashboard,
  getEngagementSummary,
  getEngagementTrend,
  getFunnelResults,
  getLearningPaths,
  getLessonAnalyticsDashboard,
  getPredictionSummary,
  getRetentionMatrix,
  getStudentPath,
  getStudentPrediction,
  getStudentSignalsDashboard,
  getTeacherAnalytics,
  listFunnelDefinitions,
  refreshAllCourseStats,
  refreshCourseStats,
  saveFunnelDefinition,
} from "./analyticsQueries";

export type { LiveEvent } from "./analyticsQueries";

export const analyticsService = {
  refreshCourseStats,
  getTeacherAnalytics,
  refreshAllCourseStats,

  async getTenantAnalyticsOverview(
    tenantId: string,
  ): Promise<TenantAnalyticsOverview> {
    const stats = await fetchTenantCourseStats(tenantId);
    return aggregateTenantOverview(stats);
  },

  async getActivityMetrics(
    tenantId: string,
    days: number = 30,
  ): Promise<ActivityMetrics> {
    const rows = await fetchActivityCounts(tenantId, days);
    return aggregateActivityMetrics(rows);
  },

  getCourseEngagementStats(tenantId: string): Promise<CourseEngagement[]> {
    return fetchCourseEngagement(tenantId);
  },

  getActivityTimeline(
    tenantId: string,
    days: number = 14,
  ): Promise<ActivityTimePoint[]> {
    return fetchActivityTimeline(tenantId, days);
  },

  async getTenantAnalytics(tenantId: string): Promise<TenantAnalyticsData> {
    // ANAL-MED-01: Use Promise.allSettled so a single failure does not crash all analytics
    const [overviewResult, activityResult, courseResult, timelineResult] =
      await Promise.allSettled([
        this.getTenantAnalyticsOverview(tenantId),
        this.getActivityMetrics(tenantId),
        this.getCourseEngagementStats(tenantId),
        this.getActivityTimeline(tenantId),
      ]);

    return {
      overview:
        overviewResult.status === "fulfilled" ? overviewResult.value : null,
      activityMetrics:
        activityResult.status === "fulfilled" ? activityResult.value : null,
      courseEngagement:
        courseResult.status === "fulfilled" ? courseResult.value : null,
      activityTimeline:
        timelineResult.status === "fulfilled" ? timelineResult.value : null,
    };
  },

  // SP-12.3: Dashboard RPC methods
  getCourseAnalyticsDashboard(
    courseId: string,
    _tenantId: string,
  ): Promise<CourseAnalytics | null> {
    return getCourseAnalyticsDashboard(courseId, _tenantId);
  },

  getLessonAnalyticsDashboard(
    courseId: string,
    _tenantId: string,
  ): Promise<LessonAnalytics[]> {
    return getLessonAnalyticsDashboard(courseId, _tenantId);
  },

  getStudentSignalsDashboard(
    courseId: string,
    _tenantId: string,
    lessonId?: string,
  ): Promise<StudentSignal[]> {
    return getStudentSignalsDashboard(courseId, _tenantId, lessonId);
  },

  // SP-14: Funnel Analysis
  saveFunnelDefinition(
    name: string,
    steps: string[],
    courseId?: string,
    funnelId?: string,
  ): Promise<string> {
    return saveFunnelDefinition(name, steps, courseId, funnelId);
  },

  listFunnelDefinitions(courseId?: string): Promise<FunnelDefinition[]> {
    return listFunnelDefinitions(courseId);
  },

  deleteFunnelDefinition(funnelId: string): Promise<void> {
    return deleteFunnelDefinition(funnelId);
  },

  getFunnelResults(funnelId: string): Promise<FunnelStepResult[]> {
    return getFunnelResults(funnelId);
  },

  // SP-15: Retention & Cohort
  getRetentionMatrix(
    courseId: string,
    weeksBack: number = 8,
  ): Promise<RetentionRow[]> {
    return getRetentionMatrix(courseId, weeksBack);
  },

  // SP-16: Engagement Scoring
  getEngagementSummary(courseId: string): Promise<EngagementSummaryRow[]> {
    return getEngagementSummary(courseId);
  },

  getEngagementTrend(
    courseId: string,
    days: number = 30,
  ): Promise<EngagementTrendPoint[]> {
    return getEngagementTrend(courseId, days);
  },

  // SP-17: Learning Path Analysis
  getLearningPaths(
    courseId: string,
    minUsers: number = 1,
  ): Promise<LearningPath[]> {
    return getLearningPaths(courseId, minUsers);
  },

  getStudentPath(userId: string, courseId: string): Promise<StudentPathStep[]> {
    return getStudentPath(userId, courseId);
  },

  // SP-19: Predictive Analytics
  getAtRiskStudents(
    courseId: string,
    minRisk: number = 0.3,
  ): Promise<StudentPrediction[]> {
    return getAtRiskStudents(courseId, minRisk);
  },

  getStudentPrediction(
    userId: string,
    courseId: string,
  ): Promise<PredictionDetail | null> {
    return getStudentPrediction(userId, courseId);
  },

  getPredictionSummary(courseId: string): Promise<PredictionSummary | null> {
    return getPredictionSummary(courseId);
  },

  // Live Activity Feed
  fetchLatestEvents(tenantId: string, limit = 10) {
    return fetchLatestEvents(tenantId, limit);
  },
};
