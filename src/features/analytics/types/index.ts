// Learning event tracking types (SP-12)
export * from './events.types'

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
  | 'STUDENT_ENROLLED'

// Course stats row interface
export interface CourseStatsRow {
  id: string
  tenant_id: string
  course_id: string
  total_enrolled: number
  active_students: number
  avg_progress: number
  avg_quiz_score: number
  lesson_completion_rate: unknown
  quiz_pass_rate: unknown
  student_ranking: unknown
  last_refreshed_at: string
}

// Activity event row interface
export interface ActivityEventRow {
  id: string
  tenant_id: string
  event_type: ActivityEventType
  event_version: string
  actor_id: string
  payload: unknown
  created_at: string
}

// Aggregated tenant analytics overview
export interface TenantAnalyticsOverview {
  totalEnrolled: number
  activeStudents: number
  totalCourses: number
  coursesRunning: number
  avgProgress: number
  avgQuizScore: number
  lastRefreshedAt: string | null
}

// Activity metrics counts
export interface ActivityMetrics {
  lessonCompletions: number
  quizAttempts: number
  assignmentSubmissions: number
  totalEvents: number
}

// Course engagement data
export interface CourseEngagement {
  courseId: string
  courseName: string
  enrolled: number
  activeStudents: number
  avgProgress: number
  avgQuizScore: number
}

// Activity over time data point
export interface ActivityTimePoint {
  date: string
  lessonCompletions: number
  quizAttempts: number
  assignmentSubmissions: number
}

// Combined tenant analytics data for dashboard.
// Fields are nullable because getTenantAnalytics uses Promise.allSettled —
// a partial failure yields null for the failed slice rather than crashing the whole dashboard.
export interface TenantAnalyticsData {
  overview: TenantAnalyticsOverview | null
  activityMetrics: ActivityMetrics | null
  courseEngagement: CourseEngagement[] | null
  activityTimeline: ActivityTimePoint[] | null
}

// Custom error types for better error handling
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code:
      | 'PERMISSION_DENIED'
      | 'RPC_NOT_FOUND'
      | 'COURSE_NOT_FOUND'
      | 'TENANT_MISMATCH'
      | 'NETWORK_ERROR'
      | 'UNKNOWN',
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'AnalyticsError'
  }
}

export interface ModuleCompletion {
  module_id: string
  title: string
  completion_rate: number
}

export interface QuizPassRate {
  quiz_id: string
  title: string
  pass_rate: number
}

export interface StudentProgressItem {
  student_id: string
  name: string
  progress: number
  last_active: string | null
}

export interface TeacherAnalyticsData {
  overview: {
    total_enrolled: number
    active_students: number
    avg_progress: number
    avg_quiz_score: number
    lesson_completion_rate: number
    quiz_pass_rate: number
    at_risk_count: number
    last_calculated_at: string
  }
  module_completion: ModuleCompletion[]
  quiz_pass_rates: QuizPassRate[]
  students: {
    top: StudentProgressItem[]
    at_risk: StudentProgressItem[]
  }
}

// SP-12.3: Dashboard Analytics types
export interface CourseAnalytics {
  course_id: string
  course_title: string
  total_students: number
  active_students_7d: number
  avg_completion_pct: number
  avg_quiz_score: number | null
  total_lessons: number
  struggling_students: number
  last_aggregated_at: string
}

export interface LessonAnalytics {
  lesson_id: string
  lesson_title: string
  module_title: string
  total_students: number
  active_students_7d: number
  completions: number
  avg_completion_pct: number
  completion_rate: number
  avg_time_spent: number
  avg_quiz_score: number | null
  struggling_students: number
  high_risk_students: number
  last_aggregated_at: string
}

export interface StudentSignal {
  user_id: string
  student_name: string
  lesson_id: string
  lesson_title: string
  session_count: number
  total_time_spent: number
  blocks_viewed: number
  blocks_total: number
  completion_pct: number
  video_replays: number
  max_video_pct: number
  quiz_attempts: number
  best_quiz_score: number | null
  quiz_passed: boolean
  struggle_score: number
  last_accessed_at: string
  engagement_score?: number | null
  engagement_segment?: EngagementSegment | null
}

// SP-16: Engagement Scoring types
export type EngagementSegment = 'high' | 'medium' | 'low' | 'at_risk'

export interface EngagementSummaryRow {
  segment: EngagementSegment
  student_count: number
  avg_score: number
}

export interface EngagementTrendPoint {
  day: string
  avg_score: number
  student_count: number
}

// SP-14: Funnel Analysis types
export interface FunnelDefinition {
  funnel_id: string
  name: string
  course_id: string | null
  steps: string[] // array of event_type strings
  step_count: number
  created_at: string
  last_computed_at: string | null
}

export interface FunnelStepResult {
  step_index: number
  event_type: string
  user_count: number
  conversion_rate: number
  drop_off_rate: number
  computed_at: string
}

// SP-15: Retention & Cohort types
export interface RetentionRow {
  cohort_week: string // ISO date string 'YYYY-MM-DD'
  period_offset: number // weeks since first access
  cohort_size: number
  retained_count: number
  retention_rate: number | null
}

// SP-17: Learning Path Analysis
export interface PathStep {
  lesson_id: string
  lesson_title: string
  completion_pct: number
  is_completed: boolean
}

export interface LearningPath {
  id: string
  path_hash: string
  path_steps: PathStep[]
  user_count: number
  avg_completion_rate: number
  avg_score: number | null
  is_optimal: boolean
  computed_at: string
}

export interface StudentPathStep {
  step_order: number
  lesson_id: string
  lesson_title: string
  module_title: string
  first_accessed_at: string
  completion_pct: number
  is_completed: boolean
  time_spent: number
}

// SP-19: Predictive Analytics
export interface StudentPrediction {
  user_id: string
  student_name: string
  churn_risk: number
  completion_likelihood: number
  churn_factors: {
    declining_sessions: boolean
    inactive_days: boolean
    high_struggle: boolean
    low_progress_long_enrolled: boolean
    low_quiz_scores: boolean
  }
  days_since_active: number
  session_trend: 'rising' | 'stable' | 'declining'
  avg_completion_pct: number
  avg_quiz_score: number | null
  computed_at: string
}

export interface PredictionDetail {
  churn_risk: number
  completion_likelihood: number
  churn_factors: Record<string, boolean>
  completion_factors: Record<string, number>
  days_since_active: number
  session_trend: 'rising' | 'stable' | 'declining'
  avg_engagement: number | null
  max_struggle: number
  avg_completion_pct: number
  avg_quiz_score: number | null
  enrollment_days: number
  computed_at: string
}

export interface PredictionSummary {
  total_students: number
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
  avg_churn_risk: number
  avg_completion_likelihood: number
  declining_sessions_count: number
}
