import { apiFetch } from '@/src/lib/api'
import { logDevError } from '@/src/utils/logDevError'

// ============================================================
// Types
// ============================================================

export interface GroupMember {
  user_id: string
  role: 'leader' | 'member'
  display_name: string
  avatar_url: string | null
}

export interface GroupSubmission {
  id: string
  status: 'draft' | 'submitted' | 'graded'
  content: string | null
  file_url: string | null
  submitted_at: string | null
  grade: number | null
  feedback: string | null
}

export interface StudentGroupData {
  group: {
    id: string
    name: string
    max_members: number
  }
  members: GroupMember[]
  submission: GroupSubmission | null
}

export interface TeacherGroupEntry {
  group_id: string
  group_name: string
  max_members: number
  member_count: number
  members: GroupMember[]
  submission_status: 'not_started' | 'draft' | 'submitted' | 'graded'
  grade: number | null
}

export interface CreateGroupInput {
  name: string
  member_ids: string[]
}

// ============================================================
// Service
// ============================================================

export const groupAssignmentService = {
  /**
   * Returns the group, members, and submission for the calling student.
   */
  async getStudentGroup(assignmentId: string): Promise<StudentGroupData | null> {
    const { data, error } = await apiFetch('/rpc/get_student_group_assignment', { method: 'POST', body: JSON.stringify({
          p_assignment_id: assignmentId,
        }) })

    if (error) {
      logDevError('groupAssignmentService', 'Error fetching student group:', error)
      throw error
    }

    return (data as StudentGroupData) ?? null
  },

  /**
   * Returns all groups with members and submission status for a teacher.
   */
  async getTeacherGroups(assignmentId: string): Promise<TeacherGroupEntry[]> {
    const { data, error } = await apiFetch('/rpc/get_teacher_group_overview', { method: 'POST', body: JSON.stringify({
          p_assignment_id: assignmentId,
        }) })

    if (error) {
      logDevError('groupAssignmentService', 'Error fetching teacher groups:', error)
      throw error
    }

    return (data as TeacherGroupEntry[]) ?? []
  },

  /**
   * Teacher creates groups with assigned members for an assignment.
   */
  async createGroups(assignmentId: string, groups: CreateGroupInput[]): Promise<void> {
    const { error } = await apiFetch('/rpc/create_assignment_groups', { method: 'POST', body: JSON.stringify({
          p_assignment_id: assignmentId,
          p_groups: groups,
        }) })

    if (error) {
      logDevError('groupAssignmentService', 'Error creating groups:', error)
      throw error
    }
  },

  /**
   * A group member submits the group assignment.
   */
  async submitGroupAssignment(params: {
    groupId: string
    assignmentId: string
    content?: string
    fileUrl?: string
  }): Promise<string> {
    const { data, error } = await apiFetch('/rpc/submit_group_assignment', { method: 'POST', body: JSON.stringify({
          p_group_id: params.groupId,
          p_assignment_id: params.assignmentId,
          p_content: params.content ?? null,
          p_file_url: params.fileUrl ?? null,
        }) })

    if (error) {
      logDevError('groupAssignmentService', 'Error submitting group assignment:', error)
      throw error
    }

    const result = data as { success: boolean; submission_id: string }
    return result.submission_id
  },

  /**
   * Teacher grades a group submission.
   */
  async gradeGroupSubmission(params: {
    submissionId: string
    grade: number
    feedback?: string
  }): Promise<void> {
    const { error } = await apiFetch('/rpc/grade_group_submission', { method: 'POST', body: JSON.stringify({
          p_submission_id: params.submissionId,
          p_grade: params.grade,
          p_feedback: params.feedback ?? null,
        }) })

    if (error) {
      logDevError('groupAssignmentService', 'Error grading group submission:', error)
      throw error
    }
  },
}
