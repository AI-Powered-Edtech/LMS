export interface GradebookEntry {
  id: string
  tenant_id: string
  student_id: string
  course_id: string
  assignment_id: string | null
  quiz_id: string | null
  score: number | null
  max_score: number
  percentage: number
  grade_letter: string | null
  notes: string | null
  graded_by: string | null
  graded_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  student_name?: string
  student_email?: string
  item_title?: string
  item_type?: 'quiz' | 'assignment'
}

export interface GradebookSettings {
  id: string
  tenant_id: string
  course_id: string
  grading_scale: Record<string, number>
  weight_quizzes: number
  weight_assignments: number
}

export interface GradebookColumn {
  id: string
  title: string
  type: 'quiz' | 'assignment'
  max_score: number
}

export interface GradebookStudent {
  id: string
  name: string
  email: string
  grades: Record<string, GradebookEntry | null> // keyed by column id
  average: number
}
