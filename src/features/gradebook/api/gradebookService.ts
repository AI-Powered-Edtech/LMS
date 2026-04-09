import { supabase } from '@/services/supabase/client'
import { fetchGradebookLegacy, submitGradeLegacy, syncGradebook } from './gradebookApi'
import { gradebookService as legacyGradebookService } from './legacyGradebookService'

export const gradebookService = {
  /**
   * Fetch gradebook data using the modern gradebookApi.
   * Fallback to legacyGradebookService if the modern API fails.
   */
  async fetchGradebook(tenantId: string, courseId: string, submissionsPage = 0) {
    try {
      return await fetchGradebookLegacy(tenantId, courseId, submissionsPage)
    } catch {
      return await legacyGradebookService.fetchGradebook(tenantId, submissionsPage)
    }
  },

  /**
   * Submit a grade using the modern gradebookApi.
   * Fallback to legacyGradebookService if the modern API fails.
   */
  async submitGrade(
    assignmentId: string,
    studentId: string,
    score: number,
    feedback: string | undefined,
    tenantId: string,
    courseId: string
  ) {
    try {
      return await submitGradeLegacy(assignmentId, studentId, courseId, score, feedback, tenantId)
    } catch {
      return await legacyGradebookService.submitGrade(
        assignmentId,
        studentId,
        score,
        feedback,
        tenantId
      )
    }
  },

  /**
   * Sync gradebook entries using the modern gradebookApi.
   */
  async syncGradebook(courseId: string, tenantId: string) {
    return await syncGradebook(courseId, tenantId)
  },

  /**
   * Get student grades using the modern gradebookApi.
   * Fallback to direct query if needed.
   */
  async getStudentGrades(studentId: string, tenantId: string) {
    try {
      return await fetchGradebookLegacy(studentId, tenantId, 0)
    } catch {
      // Fallback to direct query if fetchGradebookLegacy fails
      const { data, error: queryError } = await supabase
        .from('assignment_submissions')
        .select('id, score, status, submitted_at, assignments!inner(id, title, classes(name))')
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .order('submitted_at', { ascending: false })
        .limit(200)

      if (queryError) throw queryError
      return data ?? []
    }
  },
}
