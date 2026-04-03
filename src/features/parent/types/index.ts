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
