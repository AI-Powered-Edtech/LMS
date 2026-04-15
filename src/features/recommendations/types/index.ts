export type RecommendationType =
  | 'next_lesson'
  | 'review_quiz'
  | 'practice_weak_topic'
  | 'take_break'
  | 'continue_course'
export type RecommendationStatus = 'pending' | 'shown' | 'accepted' | 'dismissed'

export interface Recommendation {
  id: string
  tenant_id: string
  user_id: string
  course_id?: string
  recommendation_type: RecommendationType
  target_id?: string
  reason: string
  confidence: number
  priority: number
  status: RecommendationStatus
  created_at: string
  acted_at?: string
}
