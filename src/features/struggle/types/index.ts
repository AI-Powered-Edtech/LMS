export interface StruggleAlert {
  alert_id: string
  student_name: string
  student_id: string
  lesson_title: string
  lesson_id: string
  course_title: string
  course_id: string
  struggle_score: number
  severity: 'medium' | 'high'
  created_at: string
  read_at: string | null
}

export interface StruggleConfig {
  threshold_medium: number
  threshold_high: number
  notification_enabled: boolean
  student_prompt_enabled: boolean
  cooldown_hours: number
}

export interface LessonStatus {
  struggle_score: number
  severity: 'low' | 'medium' | 'high'
  prompt_enabled: boolean
  completion_pct: number
  total_sessions: number
  video_replays: number
  total_time_spent: number
}
