import { supabase } from '@/src/lib/supabase'

export type GradeStatus = 'ungraded' | 'graded' | 'needs_revision'

export interface GradebookAssignment {
  id: string
  title: string
  type: 'quiz' | 'assignment' | 'project' | 'exam' | 'presentation' | 'offline'
  maxScore: number
  date: string
}

export interface GradeEntry {
  score: number | null
  status: GradeStatus
  feedback?: string
  source?: 'assignment' | 'quiz'
}

export type GradeData = Record<string, Record<string, GradeEntry>>

export interface GradebookStudent {
  id: string
  name: string
  nis: string
  avatarSeed?: string
}

export interface GradebookData {
  assignments: GradebookAssignment[]
  students: GradebookStudent[]
  grades: GradeData
}

export const gradebookService = {
  /**
   * Fetch complete gradebook data: assignments, students, and grade entries.
   * @param tenantId - Required for multi-tenant isolation (EduSync Constitution Rule #3)
   */
  async fetchGradebook(tenantId: string): Promise<GradebookData> {
    if (!tenantId) throw new Error('tenantId is required for fetchGradebook')

    // Fetch assignments with tenant_id filter for multi-tenant isolation
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('id, title, due_date, created_at, tenant_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    const assignments: GradebookAssignment[] = (assignmentsData ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      type: 'assignment' as const,
      maxScore: 100,
      date: a.due_date
        ? new Date(a.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        : '',
    }))

    // Fetch submissions with grades - filtered by tenant for multi-tenant isolation
    const { data: submissionsData } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, status, score, feedback')
      .eq('tenant_id', tenantId)
      .order('submitted_at', { ascending: false })

    // Build grade map from submissions
    const grades: GradeData = {}
    if (submissionsData) {
      submissionsData.forEach((sub) => {
        if (!grades[sub.student_id]) grades[sub.student_id] = {}

        grades[sub.student_id][sub.assignment_id] = {
          score: sub.score ?? null,
          status: (sub.status as GradeStatus) || 'ungraded',
          feedback: sub.feedback ?? undefined,
          source: 'assignment',
        }
      })
    }

    // Fetch student profiles with tenant_id filter for multi-tenant isolation
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, tenant_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    const students: GradebookStudent[] = (profilesData ?? []).map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim() || p.email,
      nis: p.email.split('@')[0],
    }))

    // CRITICAL BUG #3 FIX: Also fetch quiz attempts and merge into grades
    // This syncs quiz results to the gradebook
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts_v2')
      .select('id, quiz_id, student_id, score, status, tenant_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'GRADED')

    // Merge quiz results into grades - quizzes appear as assignments in gradebook
    if (quizAttempts && quizAttempts.length > 0) {
      quizAttempts.forEach((attempt) => {
        if (!grades[attempt.student_id]) grades[attempt.student_id] = {}
        grades[attempt.student_id][attempt.quiz_id] = {
          score: attempt.score,
          status: 'graded',
          feedback: undefined,
          source: 'quiz',
        }
      })
    }

    return { assignments, students, grades }
  },

  /**
   * Submit a grade via direct database operation.
   * Uses RLS policies for security - replaces non-existent edge function.
   * @param assignmentId - The assignment ID
   * @param studentId - The student ID
   * @param score - The score to assign
   * @param feedback - Optional feedback
   * @param tenantId - Required for multi-tenant isolation
   */
  async submitGrade(
    assignmentId: string,
    studentId: string,
    score: number,
    feedback: string | undefined,
    tenantId: string
  ): Promise<void> {
    if (!tenantId) throw new Error('tenantId is required for submitGrade')

    // Use direct Supabase update with RLS - more reliable than edge function
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        score,
        feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .match({
        assignment_id: assignmentId,
        student_id: studentId,
        tenant_id: tenantId,
      })

    if (error) throw error
  },
}
