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
