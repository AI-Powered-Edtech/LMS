import { supabase } from '@/src/services/supabase/client'

export const gradebookService = {
  async getStudentGrades(studentId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(
        'id, score, status, submitted_at, assignments!inner(id, title, max_points, classes(name))'
      )
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .order('submitted_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return data ?? []
  },
}
