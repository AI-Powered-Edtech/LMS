// ==========================================================================
// Principal Feature — Types
// ==========================================================================

export interface ExecutiveOverview {
  total_students: number
  active_students: number
  total_teachers: number
  active_teachers: number
  total_courses: number
  avg_quiz_score: number
  adoption_rate: number
}

export interface ROIMetrics {
  paper_saved_sheets: number // estimasi lembar kertas yang dihemat
  paper_saved_cost: number // Rp
  teacher_time_saved_hours: number // jam/minggu
  digital_adoption_score: number // 0-100
}

export interface MonthlyTrend {
  month: string
  active_students: number
  lesson_completions: number
  quiz_attempts: number
}

export interface PrincipalSettings {
  id?: string
  tenant_id: string
  school_name?: string
  academic_year?: string
  report_recipients?: string[]
  enable_roi_display?: boolean
  logo_url?: string | null
  // Report scheduler fields
  report_schedule?: 'monthly' | 'weekly' | 'quarterly' | null
  report_email?: string | null
  report_auto_enabled?: boolean
  // Dashboard widget visibility settings
  widget_adoption?: boolean
  widget_academic?: boolean
  widget_roi?: boolean
  widget_teacher_ranking?: boolean
  widget_survey?: boolean
  // Baseline for before-after analytics
  baseline_date?: string
  created_at?: string
  updated_at?: string
}

// ── Report Types ────────────────────────────────────────────

export type ReportType = 'monthly' | 'academic' | 'roi'
export type ReportFormat = 'pdf' | 'csv'

export interface ReportMetric {
  label: string
  value: string
  sub?: string
}

export interface ReportMonthlyTrend {
  month: string
  active_students: number
  lesson_completions: number
  quiz_attempts: number
}

export interface ExecutiveReportData {
  reportType: ReportType
  generatedAt: string
  period: string
  schoolName: string
  academicYear: string
  metrics: ReportMetric[]
  monthlyTrend: ReportMonthlyTrend[]
  academic: {
    avgScore: number
    projectedPassRate: number
    totalStudents: number
    activeStudents: number
    atRiskStudents: number
    totalCourses: number
  }
  adoption: {
    studentAdoptionPct: number
    teacherAdoptionPct: number
    adoptionScore: number
  }
  roi: {
    paperSavedSheets: number
    paperSavedCost: number
    teacherTimeSavedHours: number
  }
}

export interface ReportGeneratorState {
  reportType: ReportType
  month: number
  year: number
  formats: ReportFormat[]
}

export interface ReportSchedulerState {
  frequency: 'monthly' | 'weekly' | 'quarterly'
  email: string
  enabled: boolean
}

// ── Before-After Analytics ────────────────────────────────────

export interface SchoolBaselineMetrics {
  id?: string
  tenant_id?: string
  baseline_date: string // ISO date string
  avg_grade_before: number | null
  attendance_rate_before: number | null
  paper_cost_monthly_rp: number | null
  teacher_grading_hours_weekly: number | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface BeforeAfterComparison {
  metric: string
  unit: string
  before: number | null
  after: number | null
  delta: number | null
  deltaPercent: number | null
  isPositiveGood: boolean // apakah kenaikan itu bagus (nilai/kehadiran) atau penurunan bagus (biaya/jam)
}

// ── Satisfaction Survey ───────────────────────────────────────

export type SurveyStatus = 'draft' | 'active' | 'closed'
export type SurveyAudience = 'teachers' | 'students' | 'parents' | 'all'
export type QuestionType = 'rating' | 'yesno' | 'text'

export interface SurveyQuestion {
  id: string
  type: QuestionType
  text: string
  required: boolean
}

export interface SatisfactionSurvey {
  id: string
  tenant_id: string
  title: string
  target_audience: SurveyAudience
  status: SurveyStatus
  questions: SurveyQuestion[]
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
}

export interface SurveyResponse {
  id: string
  survey_id: string
  tenant_id: string
  respondent_id: string | null
  answers: Record<string, string | number | boolean>
  submitted_at: string
}

export interface SurveyResultsData {
  survey: SatisfactionSurvey
  totalResponses: number
  questionResults: QuestionResult[]
}

export interface QuestionResult {
  question: SurveyQuestion
  ratingAvg?: number
  ratingDistribution?: Record<number, number> // {1: count, 2: count, ...}
  yesCount?: number
  noCount?: number
  textAnswers?: string[]
}

export interface CreateSurveyInput {
  title: string
  target_audience: SurveyAudience
  questions: SurveyQuestion[]
  start_date: string | null
  end_date: string | null
}
