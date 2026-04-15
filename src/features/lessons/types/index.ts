export interface InteractiveEvent {
  timeInSeconds: number
  type: 'quiz' | 'info'
  quizId?: string
  content?: string
}

export interface InteractiveVideoMetadata {
  durationInSeconds?: number
  interactiveEvents?: InteractiveEvent[]
  [key: string]: unknown // preserve other metadata
}

export interface LessonResource {
  id: string
  lesson_id: string
  type: string // 'text' | 'video' | 'image' | 'file' | 'quiz' | 'assignment' | 'scorm'
  url: string | null // nullable — text/quiz/assignment blocks have no URL
  title: string | null
  content: string | null
  metadata: Record<string, unknown>
  order_index: number
  quiz_id?: string | null // ADD: from SP-0.5 migration
  assignment_id?: string | null // ADD: from SP-0.5 migration
  storage_object_id?: string | null // For image/file blocks
}

export interface QuizOption {
  id: string
  text: string
  is_correct?: boolean // Only available server-side
}

export interface QuizQuestion {
  id: string
  text: string
  order: number
  quiz_options: QuizOption[]
}

export interface Assignment {
  id: string
  tenant_id: string
  course_id: string
  lesson_id: string
  title: string
  instructions: string | null
  max_points: number
  max_attempts: number
  is_published: boolean
  due_date: string | null
  created_at: string
}

export interface Quiz {
  id: string
  lesson_id: string | null
  title: string
  instructions: string | null
  time_limit_minutes: number | null
  max_attempts: number
  passing_score?: number | null
  quiz_questions: QuizQuestion[]
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content: string | null
  type: string
  order: number
  passing_score: number | null
  is_published: boolean
  duration_minutes: number | null
  tenant_id: string
  course_id: string // From join
  lesson_resources: LessonResource[]
  quizzes: Quiz[]
  assignments?: Assignment[]
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  status: string
  progress_percentage: number
  last_position: number | null
  completed: boolean
  completed_at: string | null
  last_block_id?: string | null
  last_block_index?: number | null
  last_block_offset?: number | null
  last_video_position?: number | null
}

export interface SignedProgressQueue {
  payload: string
  signature: string
  createdAt: number
}

export interface ProgressQueueItem {
  lessonId: string
  status: 'started' | 'in_progress' | 'completed'
  progressPercentage: number
  lastPosition: number | null
  timestamp: number
  resumeAnchor?: {
    lastBlockId?: string
    lastBlockIndex?: number
    lastBlockOffset?: number
    lastVideoPosition?: number
  }
}
