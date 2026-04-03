export interface LearningRecommendation {
  lesson_id: string
  lesson_title: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface RecommendationResult {
  recommendations: LearningRecommendation[]
  generated_by: 'ai' | 'rule_based'
}
