export type ConditionType =
  | 'quiz_score_below'
  | 'quiz_score_above'
  | 'time_spent_below'
  | 'assignment_score_below'
  | 'lesson_not_completed'
  | 'always'

export interface ConditionValue {
  threshold?: number // for quiz/assignment score conditions
  min_seconds?: number // for time_spent_below
}

export interface PathRule {
  id: string
  course_id: string
  source_lesson_id: string
  condition_type: ConditionType
  condition_value: ConditionValue
  target_lesson_id: string
  priority: number
  is_active: boolean
  label: string
  tenant_id: string
  created_by: string
  created_at: string
}

export type PathRuleInsert = Omit<PathRule, 'id' | 'tenant_id' | 'created_by' | 'created_at'>

export interface EvaluationResult {
  next_lesson_id: string | null
  reason: string | null
  rule_id: string | null
  is_adaptive: boolean
}

export interface LessonNode {
  id: string
  title: string
  order: number
  module_id: string
  module_title: string
  is_remedial: boolean
}
