export interface LiveProgressCardData {
  lessonId: string
  lessonTitle: string
  courseId: string
  courseName: string
  totalStudents: number
  completedStudents: number
  inProgressStudents: number
  notStartedStudents: number
  averageProgress: number
  averageTimeSpent: number // in minutes
}

export interface StudentActivityData {
  studentId: string
  studentName: string
  currentLesson: string | null
  progress: number
  timeSpent: number // in minutes
  lastActivity: string
  status: 'active' | 'idle' | 'inactive'
  alerts: string[]
}

export interface LessonTimelineEvent {
  id: string
  studentId: string
  studentName: string
  eventType: 'started' | 'completed' | 'stuck' | 'helped'
  lessonId: string
  lessonTitle: string
  timestamp: string
  details?: string
}

export interface LessonMonitorData {
  liveProgress: LiveProgressCardData[]
  studentActivity: StudentActivityData[]
  timeline: LessonTimelineEvent[]
  summary: {
    totalActiveStudents: number
    totalLessonsInProgress: number
    studentsNeedingHelp: number
    averageCompletionRate: number
  }
}
