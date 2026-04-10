/* eslint-disable max-lines */
import { getRealtimeProvider } from '@/services/realtime'
import { supabase } from '@/services/supabase/client'
import { logDevError } from '@/utils/logDevError'

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
  submission_id: string | null
  grade: number | null
}

export interface CreateGroupInput {
  name: string
  member_ids: string[]
}

export interface EligibleStudent {
  user_id: string
  full_name: string
  avatar_url: string | null
  already_assigned: boolean
}

export interface GroupSettings {
  method: 'random' | 'gcr_sync' | 'manual' | 'student_choice'
  doc_collaboration: 'single_doc' | 'shared_folder'
  peer_review_required: boolean
}

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  method: 'manual',
  doc_collaboration: 'single_doc',
  peer_review_required: true,
}

// ============================================================
// Group Tasks & Chat Types
// ============================================================

export interface GroupTask {
  id: string
  group_id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  created_by: string
  tenant_id: string
  created_at: string
  profiles?: {
    first_name: string
    last_name: string
  } | null
}

export interface CreateGroupTaskInput {
  title: string
  description?: string
  assigned_to?: string
  due_date?: string
}

export interface GroupMessage {
  id: string
  group_id: string
  user_id: string
  content: string
  tenant_id: string
  created_at: string
  profiles?: {
    first_name: string
    last_name: string
  } | null
}

interface GroupTaskRow {
  id: string
  group_id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  created_by: string
  tenant_id: string
  created_at: string
}

interface GroupMessageRow {
  id: string
  group_id: string
  user_id: string
  content: string
  tenant_id: string
  created_at: string
}

function toDisplayName(profile?: {
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
} | null): string {
  if (!profile) return 'Tanpa Nama'
  if (profile.full_name) return profile.full_name
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || 'Tanpa Nama'
}

async function fetchProfiles(
  userIds: string[],
  tenantId: string
): Promise<Map<string, { full_name: string | null; avatar_url: string | null; first_name?: string | null; last_name?: string | null }>> {
  if (userIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('id', userIds)

  if (error) throw error

  return new Map(
    ((data ?? []) as Array<{
      id: string
      full_name: string | null
      avatar_url: string | null
      first_name?: string | null
      last_name?: string | null
    }>).map((profile) => [profile.id, profile])
  )
}

function mapGroupTask(
  row: GroupTaskRow,
  profileMap: Map<
    string,
    {
      full_name: string | null
      avatar_url: string | null
      first_name?: string | null
      last_name?: string | null
    }
  >
): GroupTask {
  const assignee = row.assigned_to ? profileMap.get(row.assigned_to) : null
  return {
    ...row,
    profiles: assignee
      ? {
          first_name: assignee.first_name ?? assignee.full_name ?? '',
          last_name: assignee.last_name ?? '',
        }
      : null,
  }
}

function mapGroupMessage(
  row: GroupMessageRow,
  profileMap: Map<
    string,
    {
      full_name: string | null
      avatar_url: string | null
      first_name?: string | null
      last_name?: string | null
    }
  >
): GroupMessage {
  const author = profileMap.get(row.user_id)
  return {
    ...row,
    profiles: author
      ? {
          first_name: author.first_name ?? author.full_name ?? '',
          last_name: author.last_name ?? '',
        }
      : null,
  }
}

// ============================================================
// Service
// ============================================================

export const groupAssignmentService = {
  /**
   * Returns students enrolled in the assignment's class, marking those
   * already assigned to a group for this assignment.
   */
  async getEligibleStudents(assignmentId: string, tenantId: string): Promise<EligibleStudent[]> {
    // 1. Get class_id from the assignment — scoped to tenant
    const { data: assignment, error: asgErr } = await supabase
      .from('assignments')
      .select('class_id')
      .eq('id', assignmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (asgErr || !assignment?.class_id) {
      logDevError('groupAssignmentService', 'Error fetching assignment class_id:', asgErr)
      return []
    }

    // 2. Get enrolled students for the class — scoped to tenant
    const { data: enrolled, error: enrollErr } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', assignment.class_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')

    if (enrollErr) {
      logDevError('groupAssignmentService', 'Error fetching enrolled students:', enrollErr)
      throw enrollErr
    }

    if (!enrolled || enrolled.length === 0) return []

    const studentIds = (enrolled as Array<{ student_id: string }>).map((row) => row.student_id)
    const profileMap = await fetchProfiles(studentIds, tenantId)

    // 3. Get already-assigned member user_ids for this assignment
    const { data: groups, error: groupError } = await supabase
      .from('assignment_groups')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('tenant_id', tenantId)

    if (groupError) {
      logDevError('groupAssignmentService', 'Error fetching assignment groups:', groupError)
      throw groupError
    }

    const groupIds = (groups ?? []).map((group) => group.id)
    const { data: existingMembers, error: memberError } =
      groupIds.length > 0
        ? await supabase
            .from('assignment_group_members')
            .select('user_id')
            .eq('tenant_id', tenantId)
            .in('group_id', groupIds)
        : { data: [], error: null }

    if (memberError) {
      logDevError('groupAssignmentService', 'Error fetching group members:', memberError)
      throw memberError
    }

    const assignedSet = new Set((existingMembers ?? []).map((m) => m.user_id))

    // 4. Map and return
    return (enrolled as Array<{ student_id: string }>).map((row) => {
      const profile = profileMap.get(row.student_id)
      return {
        user_id: row.student_id,
        full_name: toDisplayName(profile),
        avatar_url: profile?.avatar_url ?? null,
        already_assigned: assignedSet.has(row.student_id),
      }
    })
  },

  /**
   * Returns the group, members, and submission for the calling student.
   */
  async getStudentGroup(userId: string, assignmentId: string): Promise<StudentGroupData | null> {
    const { data, error } = await supabase.rpc('get_student_group_assignment', {
      p_user_id: userId,
      p_assignment_id: assignmentId,
    })

    if (error) {
      logDevError('groupAssignmentService', 'Error fetching student group:', error)
      throw error
    }

    if (!data || typeof data !== 'object') return null

    const d = data as Record<string, unknown>
    if (!d.group || !Array.isArray(d.members)) return null

    return data as StudentGroupData
  },

  /**
   * Returns all groups with members and submission status for a teacher.
   */
  async getTeacherGroups(assignmentId: string): Promise<TeacherGroupEntry[]> {
    const { data, error } = await supabase.rpc('get_teacher_group_overview', {
      p_assignment_id: assignmentId,
    })

    if (error) {
      logDevError('groupAssignmentService', 'Error fetching teacher groups:', error)
      throw error
    }

    if (!data || !Array.isArray(data)) return []

    return data as TeacherGroupEntry[]
  },

  /**
   * Teacher creates groups with assigned members for an assignment.
   */
  async createGroups(assignmentId: string, groups: CreateGroupInput[]): Promise<void> {
    const { error } = await supabase.rpc('create_assignment_groups', {
      p_assignment_id: assignmentId,
      p_groups: groups,
    })

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
    const { data, error } = await supabase.rpc('submit_group_assignment', {
      p_group_id: params.groupId,
      p_assignment_id: params.assignmentId,
      p_content: params.content ?? null,
      p_file_url: params.fileUrl ?? null,
    })

    if (error) {
      logDevError('groupAssignmentService', 'Error submitting group assignment:', error)
      throw error
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Respons RPC tidak valid.')
    }

    const result = data as Record<string, unknown>
    if (typeof result.submission_id !== 'string') {
      throw new Error('submission_id tidak ditemukan dalam respons.')
    }

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
    const { error } = await supabase.rpc('grade_group_submission', {
      p_submission_id: params.submissionId,
      p_grade: params.grade,
      p_feedback: params.feedback ?? null,
    })

    if (error) {
      logDevError('groupAssignmentService', 'Error grading group submission:', error)
      throw error
    }
  },

  /**
   * Returns group settings for an assignment.
   */
  async getGroupSettings(assignmentId: string): Promise<GroupSettings> {
    const { data, error } = await supabase.rpc('get_group_settings', {
      p_assignment_id: assignmentId,
    })

    if (error) {
      logDevError('groupAssignmentService', 'Error fetching group settings:', error)
      throw error
    }

    const raw = (data ?? {}) as Record<string, unknown>
    return {
      method: (raw.method as GroupSettings['method']) ?? DEFAULT_GROUP_SETTINGS.method,
      doc_collaboration:
        (raw.doc_collaboration as GroupSettings['doc_collaboration']) ??
        DEFAULT_GROUP_SETTINGS.doc_collaboration,
      peer_review_required:
        typeof raw.peer_review_required === 'boolean'
          ? raw.peer_review_required
          : DEFAULT_GROUP_SETTINGS.peer_review_required,
    }
  },

  /**
   * Updates group settings for an assignment (teacher only).
   */
  async updateGroupSettings(assignmentId: string, settings: GroupSettings): Promise<void> {
    const { error } = await supabase.rpc('update_group_settings', {
      p_assignment_id: assignmentId,
      p_settings: settings,
    })

    if (error) {
      logDevError('groupAssignmentService', 'Error updating group settings:', error)
      throw error
    }
  },

  /**
   * Fetches tasks for a specific group with tenant isolation.
   */
  async getGroupTasks(groupId: string, tenantId: string): Promise<GroupTask[]> {
    const { data, error } = await supabase
      .from('group_tasks')
      .select('id, group_id, title, description, assigned_to, status, due_date, created_by, tenant_id, created_at')
      .eq('group_id', groupId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (error) {
      logDevError('groupAssignmentService', 'Error fetching group tasks:', error)
      throw error
    }

    const rows = (data ?? []) as GroupTaskRow[]
    const assigneeIds = rows
      .map((row) => row.assigned_to)
      .filter((assignedTo): assignedTo is string => Boolean(assignedTo))
    const profileMap = await fetchProfiles(assigneeIds, tenantId)
    return rows.map((row) => mapGroupTask(row, profileMap))
  },

  /**
   * Creates a new task for a group with tenant isolation.
   */
  async createGroupTask(
    groupId: string,
    taskData: CreateGroupTaskInput,
    userId: string,
    tenantId: string
  ): Promise<GroupTask> {
    const { data: newTask, error } = await supabase
      .from('group_tasks')
      .insert({
        group_id: groupId,
        tenant_id: tenantId,
        title: taskData.title,
        description: taskData.description,
        assigned_to: taskData.assigned_to,
        due_date: taskData.due_date,
        created_by: userId,
      })
      .select('id, group_id, title, description, assigned_to, status, due_date, created_by, tenant_id, created_at')
      .single()

    if (error) {
      logDevError('groupAssignmentService', 'Error creating group task:', error)
      throw error
    }

    const profileMap = await fetchProfiles(
      newTask?.assigned_to ? [newTask.assigned_to] : [],
      tenantId
    )
    return mapGroupTask(newTask as GroupTaskRow, profileMap)
  },

  /**
   * Updates the status of a group task with tenant isolation.
   */
  async updateGroupTaskStatus(
    taskId: string,
    status: 'todo' | 'in_progress' | 'done',
    tenantId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('group_tasks')
      .update({ status })
      .eq('id', taskId)
      .eq('tenant_id', tenantId)

    if (error) {
      logDevError('groupAssignmentService', 'Error updating group task status:', error)
      throw error
    }
  },

  /**
   * Fetches messages for a specific group chat with tenant isolation.
   */
  async getGroupMessages(groupId: string, tenantId: string): Promise<GroupMessage[]> {
    const { data, error } = await supabase
      .from('group_messages')
      .select('id, group_id, user_id, content, tenant_id, created_at')
      .eq('group_id', groupId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (error) {
      logDevError('groupAssignmentService', 'Error fetching group messages:', error)
      throw error
    }

    const rows = (data ?? []) as GroupMessageRow[]
    const profileMap = await fetchProfiles(
      rows.map((row) => row.user_id),
      tenantId
    )
    return rows.map((row) => mapGroupMessage(row, profileMap))
  },

  /**
   * Sends a new message to a group chat with tenant isolation.
   */
  async sendGroupMessage(
    groupId: string,
    content: string,
    userId: string,
    tenantId: string
  ): Promise<GroupMessage> {
    const { data: newMessage, error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        tenant_id: tenantId,
        content,
        user_id: userId,
      })
      .select('id, group_id, user_id, content, tenant_id, created_at')
      .single()

    if (error) {
      logDevError('groupAssignmentService', 'Error sending group message:', error)
      throw error
    }

    const profileMap = await fetchProfiles([userId], tenantId)
    return mapGroupMessage(newMessage as GroupMessageRow, profileMap)
  },

  /**
   * Subscribes to realtime group messages inserts.
   */
  subscribeToGroupMessages(
    groupId: string,
    tenantId: string,
    onInsert: (message: GroupMessage) => void
  ) {
    const channel = getRealtimeProvider()
      .channel(`group_messages:${groupId}:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}&tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          onInsert(payload.new as GroupMessage)
        }
      )
      .subscribe()

    return {
      unsubscribe: () => {
        void getRealtimeProvider().removeChannel(channel)
      },
    }
  },
}

// ============================================================
// Group Tasks (legacy RPC-based service — kept for compatibility)
// ============================================================

export const groupAssignmentTaskService = {
  async getGroupTasks(groupId: string, tenantId: string): Promise<GroupTask[]> {
    return groupAssignmentService.getGroupTasks(groupId, tenantId)
  },

  async createGroupTask(
    params: { groupId: string; title: string; assignee_id?: string },
    userId: string,
    tenantId: string
  ): Promise<string> {
    const task = await groupAssignmentService.createGroupTask(
      params.groupId,
      { title: params.title, assigned_to: params.assignee_id },
      userId,
      tenantId
    )
    return task.id
  },

  async updateGroupTaskStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed',
    tenantId: string
  ): Promise<void> {
    // Map legacy status values to new schema values
    const statusMap: Record<string, 'todo' | 'in_progress' | 'done'> = {
      pending: 'todo',
      in_progress: 'in_progress',
      completed: 'done',
    }
    return groupAssignmentService.updateGroupTaskStatus(
      taskId,
      statusMap[status] ?? 'todo',
      tenantId
    )
  },

  async deleteGroupTask(taskId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('group_tasks')
      .delete()
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
    if (error) {
      logDevError('groupAssignmentService', 'Error deleting group task:', error)
      throw error
    }
  },
}
