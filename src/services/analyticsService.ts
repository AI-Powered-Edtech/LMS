import { supabase } from '../lib/supabase';

// Event types for activity events
export type ActivityEventType = 
    | 'LESSON_STARTED'
    | 'LESSON_PROGRESS_UPDATED'
    | 'LESSON_COMPLETED'
    | 'QUIZ_STARTED'
    | 'QUIZ_SUBMITTED'
    | 'QUIZ_ATTEMPT'
    | 'ASSIGNMENT_CREATED'
    | 'ASSIGNMENT_SUBMITTED'
    | 'ASSIGNMENT_GRADED'
    | 'CLASS_JOINED'
    | 'STUDENT_ENROLLED';

// Course stats row interface
export interface CourseStatsRow {
    id: string;
    tenant_id: string;
    course_id: string;
    total_enrolled: number;
    active_students: number;
    avg_progress: number;
    avg_quiz_score: number;
    lesson_completion_rate: unknown;
    quiz_pass_rate: unknown;
    student_ranking: unknown;
    last_refreshed_at: string;
}

// Activity event row interface
export interface ActivityEventRow {
    id: string;
    tenant_id: string;
    event_type: ActivityEventType;
    event_version: string;
    actor_id: string;
    payload: unknown;
    created_at: string;
}

// Aggregated tenant analytics overview
export interface TenantAnalyticsOverview {
    totalEnrolled: number;
    activeStudents: number;
    totalCourses: number;
    coursesRunning: number;
    avgProgress: number;
    avgQuizScore: number;
    lastRefreshedAt: string | null;
}

// Activity metrics counts
export interface ActivityMetrics {
    lessonCompletions: number;
    quizAttempts: number;
    assignmentSubmissions: number;
    totalEvents: number;
}

// Course engagement data
export interface CourseEngagement {
    courseId: string;
    courseName: string;
    enrolled: number;
    activeStudents: number;
    avgProgress: number;
    avgQuizScore: number;
}

// Activity over time data point
export interface ActivityTimePoint {
    date: string;
    lessonCompletions: number;
    quizAttempts: number;
    assignmentSubmissions: number;
}

// Combined tenant analytics data for dashboard
export interface TenantAnalyticsData {
    overview: TenantAnalyticsOverview;
    activityMetrics: ActivityMetrics;
    courseEngagement: CourseEngagement[];
    activityTimeline: ActivityTimePoint[];
}

// Custom error types for better error handling
export class AnalyticsError extends Error {
    constructor(
        message: string,
        public code: 'PERMISSION_DENIED' | 'RPC_NOT_FOUND' | 'COURSE_NOT_FOUND' | 'TENANT_MISMATCH' | 'NETWORK_ERROR' | 'UNKNOWN',
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'AnalyticsError';
    }
}

export interface ModuleCompletion {
    module_id: string;
    title: string;
    completion_rate: number;
}

export interface QuizPassRate {
    quiz_id: string;
    title: string;
    pass_rate: number;
}

export interface StudentProgressItem {
    student_id: string;
    name: string;
    progress: number;
    last_active: string | null;
}

export interface TeacherAnalyticsData {
    overview: {
        total_enrolled: number;
        active_students: number;
        avg_progress: number;
        avg_quiz_score: number;
        lesson_completion_rate: number;
        quiz_pass_rate: number;
        at_risk_count: number;
        last_calculated_at: string;
    };
    module_completion: ModuleCompletion[];
    quiz_pass_rates: QuizPassRate[];
    students: {
        top: StudentProgressItem[];
        at_risk: StudentProgressItem[];
    };
}

/**
 * Parse Supabase RPC error and return user-friendly error
 */
function parseRpcError(error: unknown): AnalyticsError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for specific error patterns
    if (errorMessage.includes('function not found') || errorMessage.includes('does not exist')) {
        return new AnalyticsError(
            'Konfigurasi analitik belum lengkap. Silakan hubungi administrator sistem.',
            'RPC_NOT_FOUND',
            error
        );
    }
    
    if (errorMessage.includes('unauthorized') || errorMessage.includes('must be teacher') || errorMessage.includes('must be teacher or admin')) {
        return new AnalyticsError(
            'Anda tidak memiliki akses ke analitik kursus ini. Hanya guru dan admin yang dapat melihat.',
            'PERMISSION_DENIED',
            error
        );
    }
    
    if (errorMessage.includes('course not found')) {
        return new AnalyticsError(
            'Kursus tidak ditemukan atau telah dihapus.',
            'COURSE_NOT_FOUND',
            error
        );
    }
    
    if (errorMessage.includes('Tenant mismatch') || errorMessage.includes('tenant')) {
        return new AnalyticsError(
            'Akses ditolak. Kursus tidak termasuk dalam organisasi Anda.',
            'TENANT_MISMATCH',
            error
        );
    }
    
    // Check for network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
        return new AnalyticsError(
            'Koneksi internet bermasalah. Silakan coba lagi.',
            'NETWORK_ERROR',
            error
        );
    }
    
    return new AnalyticsError(
        'Terjadi kesalahan saat memuat analitik. Silakan coba lagi.',
        'UNKNOWN',
        error
    );
}

export const analyticsService = {
    /**
     * Refreshes the pre-aggregated course_stats.
     * Note: In a production environment this should be called by a scheduled pg_cron job,
     * but we provide it here for manual refreshes.
     */
    async refreshCourseStats(courseId: string): Promise<void> {
        const { error } = await supabase.rpc('refresh_course_stats', { p_course_id: courseId });
        
        if (error) {
            console.error('Failed to refresh course stats:', error);
            throw parseRpcError(error);
        }
    },

    /**
     * Fetches the complete analytics dashboard JSON from the RPC.
     */
    async getTeacherAnalytics(courseId: string): Promise<TeacherAnalyticsData | null> {
        const { data, error } = await supabase.rpc('get_teacher_analytics', { p_course_id: courseId });

        if (error) {
            console.error('Failed to get teacher analytics:', error);
            throw parseRpcError(error);
        }

        return data as TeacherAnalyticsData | null;
    },
    
    /**
     * Refresh all course stats (admin only)
     */
    async refreshAllCourseStats(): Promise<void> {
        const { error } = await supabase.rpc('refresh_all_course_stats');
        
        if (error) {
            console.error('Failed to refresh all course stats:', error);
            throw parseRpcError(error);
        }
    },

    /**
     * Fetches tenant-level analytics overview from course_stats table.
     * Aggregates data across all courses in the tenant.
     */
    async getTenantAnalyticsOverview(tenantId: string): Promise<TenantAnalyticsOverview> {
        const { data, error } = await supabase
            .from('course_stats')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) {
            console.error('Failed to get tenant analytics overview:', error);
            throw new Error('Gagal memuat ringkasan analitik. Silakan coba lagi.');
        }

        const stats = (data as CourseStatsRow[]) || [];
        
        if (stats.length === 0) {
            return {
                totalEnrolled: 0,
                activeStudents: 0,
                totalCourses: 0,
                coursesRunning: 0,
                avgProgress: 0,
                avgQuizScore: 0,
                lastRefreshedAt: null
            };
        }

        // Aggregate across all courses
        const totalEnrolled = stats.reduce((sum, s) => sum + (s.total_enrolled || 0), 0);
        const activeStudents = stats.reduce((sum, s) => sum + (s.active_students || 0), 0);
        const coursesRunning = stats.filter(s => (s.active_students || 0) > 0).length;
        const avgProgress = stats.length > 0 
            ? stats.reduce((sum, s) => sum + (s.avg_progress || 0), 0) / stats.length 
            : 0;
        const avgQuizScore = stats.length > 0 
            ? stats.reduce((sum, s) => sum + (s.avg_quiz_score || 0), 0) / stats.length 
            : 0;

        // Get most recent refresh timestamp
        const lastRefreshedAt = stats.length > 0 
            ? stats.reduce((latest, s) => {
                const current = s.last_refreshed_at;
                return !latest || (current && new Date(current) > new Date(latest)) ? current : latest;
            }, null as string | null)
            : null;

        return {
            totalEnrolled,
            activeStudents,
            totalCourses: stats.length,
            coursesRunning,
            avgProgress: Math.round(avgProgress * 10) / 10,
            avgQuizScore: Math.round(avgQuizScore * 10) / 10,
            lastRefreshedAt
        };
    },

    /**
     * Fetches activity metrics from activity_events table.
     * Counts events by type for the tenant within a time range.
     */
    async getActivityMetrics(
        tenantId: string, 
        days: number = 30
    ): Promise<ActivityMetrics> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
            .from('activity_events')
            .select('event_type, created_at')
            .eq('tenant_id', tenantId)
            .gte('created_at', since.toISOString());

        if (error) {
            console.error('Failed to get activity metrics:', error);
            throw new Error('Gagal memuat metrik aktivitas. Silakan coba lagi.');
        }

        const events = (data as ActivityEventRow[]) || [];

        // Count by event type
        const lessonCompletions = events.filter(e => e.event_type === 'LESSON_COMPLETED').length;
        const quizAttempts = events.filter(e => 
            e.event_type === 'QUIZ_ATTEMPT' || 
            e.event_type === 'QUIZ_SUBMITTED'
        ).length;
        const assignmentSubmissions = events.filter(e => e.event_type === 'ASSIGNMENT_SUBMITTED').length;

        return {
            lessonCompletions,
            quizAttempts,
            assignmentSubmissions,
            totalEvents: events.length
        };
    },

    /**
     * Fetches course engagement data from course_stats.
     * Returns engagement metrics per course.
     */
    async getCourseEngagementStats(tenantId: string): Promise<CourseEngagement[]> {
        // First get course stats
        const { data: statsData, error: statsError } = await supabase
            .from('course_stats')
            .select('*')
            .eq('tenant_id', tenantId);

        if (statsError) {
            console.error('Failed to get course engagement stats:', statsError);
            throw new Error('Gagal memuat data engagement kursus. Silakan coba lagi.');
        }

        const stats = (statsData as CourseStatsRow[]) || [];

        // Get course names
        if (stats.length === 0) {
            return [];
        }

        const courseIds = stats.map(s => s.course_id);
        const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('id, title')
            .in('id', courseIds);

        if (coursesError) {
            console.error('Failed to get course names:', coursesError);
            // Continue without course names
        }

        const courseMap = new Map((coursesData || []).map(c => [c.id, c.title]));

        return stats.map(s => ({
            courseId: s.course_id,
            courseName: courseMap.get(s.course_id) || 'Unknown Course',
            enrolled: s.total_enrolled || 0,
            activeStudents: s.active_students || 0,
            avgProgress: Math.round((s.avg_progress || 0) * 10) / 10,
            avgQuizScore: Math.round((s.avg_quiz_score || 0) * 10) / 10
        }));
    },

    /**
     * Fetches activity timeline data for charts.
     * Returns daily activity counts over the specified period.
     */
    async getActivityTimeline(
        tenantId: string, 
        days: number = 14
    ): Promise<ActivityTimePoint[]> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
            .from('activity_events')
            .select('event_type, created_at')
            .eq('tenant_id', tenantId)
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Failed to get activity timeline:', error);
            throw new Error('Gagal memuat timeline aktivitas. Silakan coba lagi.');
        }

        const events = (data as ActivityEventRow[]) || [];

        // Group by date
        const dateMap = new Map<string, ActivityTimePoint>();

        for (const event of events) {
            const date = event.created_at.split('T')[0];
            
            if (!dateMap.has(date)) {
                dateMap.set(date, {
                    date,
                    lessonCompletions: 0,
                    quizAttempts: 0,
                    assignmentSubmissions: 0
                });
            }

            const point = dateMap.get(date)!;
            
            if (event.event_type === 'LESSON_COMPLETED') {
                point.lessonCompletions++;
            } else if (event.event_type === 'QUIZ_ATTEMPT' || event.event_type === 'QUIZ_SUBMITTED') {
                point.quizAttempts++;
            } else if (event.event_type === 'ASSIGNMENT_SUBMITTED') {
                point.assignmentSubmissions++;
            }
        }

        // Convert to array and fill missing dates
        const result: ActivityTimePoint[] = [];
        const currentDate = new Date(since);
        const endDate = new Date();

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            result.push(dateMap.get(dateStr) || {
                date: dateStr,
                lessonCompletions: 0,
                quizAttempts: 0,
                assignmentSubmissions: 0
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return result;
    },

    /**
     * Fetches all tenant analytics data combined.
     * This is the main entry point for the admin dashboard.
     */
    async getTenantAnalytics(tenantId: string): Promise<TenantAnalyticsData> {
        const [overview, activityMetrics, courseEngagement, activityTimeline] = await Promise.all([
            this.getTenantAnalyticsOverview(tenantId),
            this.getActivityMetrics(tenantId),
            this.getCourseEngagementStats(tenantId),
            this.getActivityTimeline(tenantId)
        ]);

        return {
            overview,
            activityMetrics,
            courseEngagement,
            activityTimeline
        };
    }
};
