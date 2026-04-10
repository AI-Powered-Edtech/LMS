import { supabase } from '@/services/supabase/client'

import { fetchGradebookLegacy, submitGradeLegacy, syncGradebook } from './gradebookApi'
import { gradebookService as legacyGradebookService } from './legacyGradebookService'

export const gradebookService = {
  /**
   * Fetch gradebook data using the modern gradebookApi.
   * Fallback to legacyGradebookService if the modern API fails.
   */
  async fetchGradebook(tenantId: string, courseId?: string, submissionsPage = 0) {
    if (!courseId) {
      return await legacyGradebookService.fetchGradebook(tenantId, submissionsPage)
    }

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
    courseId?: string,
    gradedBy?: string | null
  ) {
    if (!courseId) {
      return await legacyGradebookService.submitGrade(
        assignmentId,
        studentId,
        score,
        feedback,
        tenantId
      )
    }

    try {
      return await submitGradeLegacy(
        assignmentId,
        studentId,
        courseId,
        score,
        feedback,
        tenantId,
        gradedBy
      )
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
    const { data, error: queryError } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id, score, status, submitted_at')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .order('submitted_at', { ascending: false })
      .limit(200)

    if (queryError) throw queryError

    const assignmentIds = (data ?? []).map((submission) => submission.assignment_id)
    const { data: assignments, error: assignmentError } =
      assignmentIds.length > 0
        ? await supabase
            .from('assignments')
            .select('id, title, class_id')
            .eq('tenant_id', tenantId)
            .in('id', assignmentIds)
        : { data: [], error: null }

    if (assignmentError) throw assignmentError

    const classIds = ((assignments ?? []) as Array<{ class_id: string | null }>).map(
      (assignment) => assignment.class_id
    )
    const { data: classes, error: classError } =
      classIds.length > 0
        ? await supabase
            .from('classes')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .in(
              'id',
              classIds.filter((classId): classId is string => Boolean(classId))
            )
        : { data: [], error: null }

    if (classError) throw classError

    const assignmentMap = new Map(
      ((assignments ?? []) as Array<{ id: string; title: string; class_id: string | null }>).map(
        (assignment) => [assignment.id, assignment]
      )
    )
    const classMap = new Map(
      ((classes ?? []) as Array<{ id: string; name: string }>).map((klass) => [klass.id, klass.name])
    )

    return (data ?? []).map((submission) => {
      const assignment = assignmentMap.get(submission.assignment_id)
      return {
        ...submission,
        assignments: assignment
          ? {
              id: assignment.id,
              title: assignment.title,
              classes: assignment.class_id
                ? { name: classMap.get(assignment.class_id) ?? '' }
                : null,
            }
          : null,
      }
    })
  },
}
