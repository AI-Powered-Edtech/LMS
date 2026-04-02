// ==========================================================================
// Parent Feature — Types
// Wave 4 — Task 29.3: Parent Dashboard
// Wave 4 — Task 29.6: Monthly Progress Report
// ==========================================================================

export interface ChildInfo {
  student_id: string
  student_name: string
  student_avatar: string | null
  class_name: string
  relationship: 'ayah' | 'ibu' | 'wali' | 'kakak'
}

export interface ChildGradeSummary {
  subject: string
  latest_score: number
  previous_score: number | null
  trend: 'up' | 'down' | 'stable'
}

export interface AttendanceDay {
  date: string // ISO date string YYYY-MM-DD
  status: 'hadir' | 'sakit' | 'izin' | 'alpha'
}

export interface PendingAssignment {
  id: string
  title: string
  subject: string
  due_date: string // ISO datetime string
  is_overdue: boolean
}

export type TrafficLightStatus = 'green' | 'yellow' | 'red'

// ==========================================================================
// Monthly Progress Report Types — Task 29.6
// ==========================================================================

export interface ParentMonthlyReport {
  student: {
    name: string
    class: string
    avatar: string | null
  }
  period: {
    month: number
    year: number
    month_name: string // "Maret 2026"
  }
  academic: {
    subjects: Array<{
      name: string
      avg_score: number
      assignments_completed: number
      quizzes_taken: number
      best_quiz_score: number
    }>
    overall_avg: number
  }
  attendance: {
    total_days: number
    present: number
    sick: number
    excused: number
    absent: number
    attendance_rate: number
  }
  learning: {
    lessons_completed: number
    total_study_time_minutes: number
    ai_tutor_sessions: number
  }
  achievements: Array<{
    type: 'badge' | 'level_up' | 'streak'
    name: string
    earned_at: string
  }>
  teacher_notes: string | null
}

export interface AvailableReportMonth {
  month: number
  year: number
  month_name: string
  label: string // e.g. "Maret 2026"
}

export interface ChildDashboardData {
  child: ChildInfo
  traffic_light: TrafficLightStatus
  traffic_light_reason: string
  grades: ChildGradeSummary[]
  attendance_this_week: AttendanceDay[]
  pending_assignments: PendingAssignment[]
  recent_achievements: string[] // nama badge/XP yang didapat
}
