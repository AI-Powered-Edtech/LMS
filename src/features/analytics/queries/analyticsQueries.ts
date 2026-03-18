import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@/src/lib/queryKeys';
import { useAuth } from '@/src/contexts/AuthContext';
import { analyticsService } from '../api/analyticsService';
import { TeacherAnalyticsData, TenantAnalyticsData, AnalyticsError } from '../types';

const base = createQueryKeys('analytics');
const analyticsKeys = {
    ...base,
    teacher: (tenantId: string, courseId: string) =>
        [...base.all(tenantId), 'teacher', courseId] as const,
    tenantOverview: (tenantId: string) =>
        [...base.all(tenantId), 'overview'] as const,
    activity: (tenantId: string, days: number) =>
        [...base.all(tenantId), 'activity', days] as const,
    engagement: (tenantId: string) =>
        [...base.all(tenantId), 'engagement'] as const,
};

/**
 * Hook for fetching teacher analytics for a specific course
 */
export function useTeacherAnalytics(courseId?: string) {
    const { tenantId } = useAuth();

    return useQuery({
        queryKey: analyticsKeys.teacher(tenantId!, courseId!),
        queryFn: async () => {
            try {
                const result = await analyticsService.getTeacherAnalytics(courseId!, tenantId!);
                return result as TeacherAnalyticsData;
            } catch (error) {
                // Re-throw as AnalyticsError for proper error handling in UI
                if (error instanceof AnalyticsError) {
                    throw error;
                }
                // Wrap unknown errors
                throw new AnalyticsError(
                    'Terjadi kesalahan saat memuat analitik. Silakan coba lagi.',
                    'UNKNOWN',
                    error
                );
            }
        },
        enabled: !!tenantId && !!courseId,
    });
}

/**
 * Hook for fetching tenant-level analytics overview
 */
export function useTenantAnalytics() {
    const { tenantId } = useAuth();

    return useQuery({
        queryKey: analyticsKeys.tenantOverview(tenantId!),
        queryFn: () => analyticsService.getTenantAnalytics(tenantId!),
        enabled: !!tenantId,
    });
}

/**
 * Hook for fetching activity metrics for a tenant
 */
export function useActivityMetrics(days: number = 30) {
    const { tenantId } = useAuth();

    return useQuery({
        queryKey: analyticsKeys.activity(tenantId!, days),
        queryFn: () => analyticsService.getActivityMetrics(tenantId!, days),
        enabled: !!tenantId,
    });
}

/**
 * Hook for fetching course engagement stats
 */
export function useCourseEngagement() {
    const { tenantId } = useAuth();

    return useQuery({
        queryKey: analyticsKeys.engagement(tenantId!),
        queryFn: () => analyticsService.getCourseEngagementStats(tenantId!),
        enabled: !!tenantId,
    });
}

/**
 * Hook for refreshing course stats
 */
export function useRefreshCourseStats() {
    const { tenantId } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (courseId: string) => {
            try {
                await analyticsService.refreshCourseStats(courseId, tenantId!);
            } catch (error) {
                if (error instanceof AnalyticsError) {
                    throw error;
                }
                throw new AnalyticsError(
                    'Gagal memperbarui data analitik.',
                    'UNKNOWN',
                    error
                );
            }
        },
        onSuccess: (_, courseId) => {
            if (tenantId) {
                queryClient.invalidateQueries({
                    queryKey: analyticsKeys.teacher(tenantId, courseId),
                });
            }
        },
    });
}

/**
 * Hook for refreshing all course stats (admin only)
 */
export function useRefreshAllCourseStats() {
    const { tenantId } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => analyticsService.refreshAllCourseStats(tenantId!),
        onSuccess: () => {
            if (tenantId) {
                queryClient.invalidateQueries({
                    queryKey: base.all(tenantId),
                });
            }
        },
    });
}
