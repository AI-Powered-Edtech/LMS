// ==========================================================================
// Parent Feature — Types
// Wave 4 — Task 29.3: Parent Dashboard
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

export interface ChildDashboardData {
  child: ChildInfo
  traffic_light: TrafficLightStatus
  traffic_light_reason: string
  grades: ChildGradeSummary[]
  attendance_this_week: AttendanceDay[]
  pending_assignments: PendingAssignment[]
  recent_achievements: string[] // nama badge/XP yang didapat
}

// ── Monthly Report Types ──────────────────────────────────────

export interface AvailableReportMonth {
  month: number
  year: number
  month_name: string
  label: string
}

export interface ParentMonthlyReport {
  student: {
    id: string
    name: string
    avatar: string | null
    class: string
  }
  period: {
    month: number
    year: number
    month_name: string
  }
  academic: {
    overall_avg: number
    subjects: Array<{
      name: string
      avg_score: number
      total_assignments: number
      completed_assignments: number
      assignments_completed: number
      quizzes_taken: number
    }>
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
    name: string
    description: string
    earned_at: string
    type?: string
  }>
  teacher_notes: string | null
}
