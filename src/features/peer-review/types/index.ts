export interface PeerReviewConfig {
  id: string
  assignment_id: string
  reviews_per_student: number
  is_anonymous: boolean
  rubric_id: string | null
  weight_in_grade: number
  status: 'pending' | 'assigning' | 'in_review' | 'completed'
  due_date: string | null
  tenant_id: string
  created_by: string
  created_at: string
}

export interface PeerReview {
  id: string
  config_id: string
  reviewer_id: string
  submission_id: string
  status: 'assigned' | 'in_progress' | 'submitted' | 'disputed'
  overall_score: number | null
  overall_comment: string | null
  submitted_at: string | null
  tenant_id: string
  created_at: string
}

export interface PeerReviewWithDetails extends PeerReview {
  submission?: {
    student_id: string
    submission_text: string | null
    file_url: string | null
  }
}

export type PeerReviewConfigInsert = Omit<
  PeerReviewConfig,
  'id' | 'tenant_id' | 'created_by' | 'created_at' | 'status'
>
