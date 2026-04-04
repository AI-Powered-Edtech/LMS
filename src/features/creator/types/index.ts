/**
 * Creator Feature Types
 * Shared TypeScript types for AI content generation.
 */

export type AssignmentType = 'quiz' | 'reading' | 'writing'

export type BloomLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'

export interface GeneratedQuestion {
  id: string
  /** Question text / topic */
  text: string
  /** Multiple-choice options (quiz only) */
  options?: Array<{ id: string; text: string } | string>
  /** Correct answer index (quiz) or answer text (reading/writing) */
  answer?: string | number
  correctAnswer?: string
  explanation?: string
  bloomLevel?: BloomLevel | string
}

export interface GeneratedContent {
  /** Database record ID (present if saved to creator_history table) */
  id: string
  type: AssignmentType | string
  summary: string
  questions: GeneratedQuestion[]
  error?: string
}

export interface CreatorHistoryItem {
  id: string
  type: AssignmentType
  summary: string
  questions: GeneratedQuestion[]
  created_at: string
  file_name?: string
  is_used?: boolean
}
