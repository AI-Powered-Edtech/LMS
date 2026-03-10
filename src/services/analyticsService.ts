import { supabase } from '../lib/supabase';

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
    }
};
