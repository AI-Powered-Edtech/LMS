import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

export const groupAssignmentsService = {
  /**
   * Fetches group assignments with their members
   */
  async getGroupAssignments(assignmentId: string, tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('assignment_groups')
        .select(
          `
          id,
          name,
          assignment_group_members (
            user_id
          )
        `
        )
        .eq('assignment_id', assignmentId)
        .eq('tenant_id', tenantId)

      if (error) throw error
      return data
    } catch (e) {
      captureError(e, { context: 'getGroupAssignments', assignmentId })
      throw e
    }
  },

  /**
   * Submits a group assignment
   */
  async submitGroupAssignment(
    groupId: string,
    content: string,
    fileUrl: string | null,
    tenantId: string
  ) {
    try {
      const { data, error } = await supabase
        .from('group_submissions')
        .upsert(
          {
            group_id: groupId,
            content,
            file_url: fileUrl,
            tenant_id: tenantId,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'group_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    } catch (e) {
      captureError(e, { context: 'submitGroupAssignment', groupId })
      throw e
    }
  },

  /**
   * Grades a group submission
   */
  async gradeGroupSubmission(
    submissionId: string,
    score: number,
    feedback: string | null,
    teacherId: string
  ) {
    try {
      const { data, error } = await supabase
        .from('group_submissions')
        .update({
          score,
          feedback,
          graded_by: teacherId,
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (e) {
      captureError(e, { context: 'gradeGroupSubmission', submissionId })
      throw e
    }
  },
}
