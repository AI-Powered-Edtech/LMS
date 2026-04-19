import { db } from "@/services/db";
import type { ProfileRow as DBProfileRow } from "./types";

type ProfileRow = DBProfileRow;
type TeacherGroupEntry = import("./types").TeacherGroupEntry;
type GroupMessage = import("./types").GroupMessage;
type CreateGroupInput = import("./types").CreateGroupInput;
type CreateGroupTaskInput = import("./types").CreateGroupTaskInput;
type GroupTaskRow = import("./types").GroupTaskRow;
type EligibleStudent = import("./types").EligibleStudent;

export type {
  CreateGroupInput,
  CreateGroupTaskInput,
  TeacherGroupEntry,
  GroupMessage,
  GroupTaskRow,
  EligibleStudent,
};

export interface GroupSettings {
  method: string;
  doc_collaboration: "single_doc" | "shared_folder";
  peer_review_required: boolean;
}

export interface GroupTask {
  id: string;
  group_id: string;
  task_id: string;
  assigned_to?: string | null;
  status: "pending" | "in_progress" | "completed" | "overdue";
  due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
  note?: string | null;
  attachment_url?: string | null;
  is_graded?: boolean;
  grade?: number;
  grader_id?: string | null;
  graded_at?: string | null;
  feedback?: string | null;
  title?: string;
  profiles?: {
    user_id: string;
    display_name: string;
    first_name?: string;
    last_name?: string;
    avatar_url: string | null;
  } | null;
}

export interface StudentGroupData {
  groups: Array<{
    id: string;
    group_name: string;
    max_members: number;
    member_count: number;
    submission_status?: "not_started" | "draft" | "submitted" | "graded";
    submission_id?: string | null;
    grade?: number | null;
  }>;
  eligibleStudents: Array<{ user_id: string; display_name: string }>;
  submission?: {
    status: "not_started" | "draft" | "submitted" | "graded";
    grade?: number | null;
  };
  members?: Array<{
    user_id: string;
    display_name: string;
    role?: string;
  }>;
  group?: {
    id: string;
    name: string;
    max_members: number;
  };
}

export type ProfileMap = Map<string, Record<string, unknown>>;

// ─── Fetch Profiles ───────────────────────────────────────────────────────────

export async function fetchProfiles(
  userIds: string[],
  tenantId: string,
): Promise<ProfileMap> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await db
    .from<ProfileRow[]>("profiles")
    .select("id, full_name, avatar_url, first_name, last_name")
    .eq("tenant_id", tenantId)
    .in("id", userIds);

  if (error) throw error;

  return new Map(
    (data ?? []).map((profile) => [
      profile.full_name + "_" + (profile.avatar_url || ""),
      {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        first_name: profile.first_name,
        last_name: profile.last_name,
      },
    ]),
  );
}

// ─── Map Group Task ──────────────────────────────────────────────────────────

export function mapGroupTask(
  row: TeacherGroupEntry,
  profile?: ProfileRow | null,
) {
  return {
    ...row,
    profiles: profile
      ? {
          first_name: profile.first_name ?? profile.full_name ?? "",
          last_name: profile.last_name ?? "",
          avatar_url: profile.avatar_url,
        }
      : {
          first_name: "",
          last_name: "",
          avatar_url: null,
        },
  };
}

// ─── Teacher Groups ───────────────────────────────────────────────────────────

export async function getTeacherGroups(
  assignmentId: string,
): Promise<TeacherGroupEntry[]> {
  const { data, error } = await db
    .from<any>("groups")
    .select(
      `
      id,
      name as group_name,
      max_members,
      member_count,
      submission_status,
      submission_id,
      grade
    `,
    )
    .eq("assignment_id", assignmentId);

  if (error) throw error;
  return data ?? [];
}

// ─── Eligible Students ───────────────────────────────────────────────────────

export async function getEligibleStudents(
  _assignmentId: string,
  tenantId: string,
): Promise<Array<{ user_id: string; display_name: string }>> {
  const { data, error } = await db
    .from<any>("profiles")
    .select("user_id, display_name")
    .eq("tenant_id", tenantId)
    .neq("user_id", tenantId);

  if (error) throw error;
  return data ?? [];
}

// ─── Student Group ───────────────────────────────────────────────────────────

export async function getStudentGroup(
  userId: string,
  assignmentId: string,
): Promise<{
  groups: any[];
  eligibleStudents: Array<{ user_id: string; display_name: string }>;
  submission?: {
    status: "not_started" | "draft" | "submitted" | "graded";
    grade?: number | null;
  };
  members?: Array<{
    user_id: string;
    display_name: string;
  }>;
} | null> {
  const { data: groupData, error: groupError } = await db
    .from<any>("group_members")
    .select(
      `
      group_id,
      groups (id, name as group_name, max_members, member_count, submission_status, submission_id, grade)
    `,
    )
    .eq("user_id", userId)
    .eq("assignment_id", assignmentId)
    .single();

  if (groupError) {
    if (groupError.code === "PGRST116") return null;
    throw groupError;
  }

  if (!groupData) return null;

  const { data: membersData } = await db
    .from<any>("group_members")
    .select(
      `
      user_id,
      display_name
    `,
    )
    .eq("group_id", groupData.group_id);

  return {
    groups: [groupData.groups],
    eligibleStudents: membersData ?? [],
    submission: {
      status: groupData.groups.submission_status || "not_started",
      grade: groupData.groups.grade ?? null,
    },
    members: (membersData ?? []).map(
      (m: { user_id: string; display_name: string }) => ({
        user_id: m.user_id,
        display_name: m.display_name,
      }),
    ),
  };
}

// ─── Group Tasks ────────────────────────────────────────────────────────────

export async function getGroupTasks(
  groupId: string,
  _tenantId: string,
): Promise<GroupTask[]> {
  const { data, error } = await db
    .from<GroupTaskRow[]>("group_tasks")
    .select("*")
    .eq("group_id", groupId);

  if (error) throw error;
  return data ?? [];
}

export async function createGroupTask(
  groupId: string,
  data: CreateGroupTaskInput,
  _userId: string,
  _tenantId: string,
): Promise<GroupTask> {
  const { data: result, error } = await db
    .from<GroupTaskRow>("group_tasks")
    .insert({
      group_id: groupId,
      task_id: data.taskId,
      assigned_to: data.taskId,
      due_date: data.dueDate ?? null,
      note: data.note ?? null,
      attachment_url: data.attachmentUrl ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;
  return result as GroupTask;
}

export async function updateGroupTaskStatus(
  taskId: string,
  status: "pending" | "in_progress" | "completed",
  _tenantId: string,
): Promise<void> {
  const { error } = await db
    .from<GroupTaskRow>("group_tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) throw error;
}

export async function deleteGroupTask(
  taskId: string,
  _tenantId: string,
): Promise<void> {
  const { error } = await db
    .from<GroupTaskRow>("group_tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
}

// ─── Group Messages ────────────────────────────────────────────────────────────

export async function getGroupMessages(
  groupId: string,
  _tenantId: string,
): Promise<GroupMessage[]> {
  const { data, error } = await db
    .from<GroupMessage[]>("group_messages")
    .select(
      `
      id,
      user_id,
      group_id,
      content,
      created_at
    `,
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendGroupMessage(
  groupId: string,
  content: string,
  userId: string,
  _tenantId: string,
): Promise<GroupMessage> {
  const { data, error } = await db
    .from<GroupMessage>("group_messages")
    .insert({
      group_id: groupId,
      user_id: userId,
      content,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as GroupMessage;
}

export function subscribeToGroupMessages(
  _groupId: string,
  _tenantId: string,
  _callback: (message: GroupMessage) => void,
) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return { unsubscribe: () => {} };
}

// ─── Submit & Grade ────────────────────────────────────────────────────────────

export async function submitGroupAssignment(params: {
  groupId: string;
  assignmentId: string;
  content?: string;
  fileUrl?: string;
}): Promise<string> {
  const { data, error } = await db
    .from<any>("submissions")
    .insert({
      assignment_id: params.assignmentId,
      user_id: params.groupId,
      content: params.content ?? null,
      file_url: params.fileUrl ?? null,
      status: "submitted",
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? "";
}

export async function gradeGroupSubmission(params: {
  submissionId: string;
  grade: number;
  feedback?: string;
}): Promise<void> {
  const { error } = await db
    .from<any>("submissions")
    .update({
      grade: params.grade,
      feedback: params.feedback ?? null,
    })
    .eq("id", params.submissionId);

  if (error) throw error;
}

// ─── Group Settings ────────────────────────────────────────────────────────────

export async function updateGroupSettings(
  assignmentId: string,
  settings: GroupSettings,
): Promise<void> {
  const { error } = await db
    .from<any>("assignments")
    .update({
      group_method: settings.method,
      doc_collaboration: settings.doc_collaboration,
      peer_review_required: settings.peer_review_required,
    })
    .eq("id", assignmentId);

  if (error) throw error;
}

// ─── Create Groups ────────────────────────────────────────────────────────────

export async function createGroups(
  assignmentId: string,
  groups: CreateGroupInput[],
  _tenantId?: string,
): Promise<void> {
  for (const group of groups) {
    const { data: groupData, error: groupError } = await db
      .from<any>("groups")
      .insert({
        assignment_id: assignmentId,
        name: group.name,
      })
      .select("id")
      .maybeSingle();

    if (groupError) throw groupError;
    if (!groupData) throw new Error("Failed to create group");

    if (group.member_ids.length > 0) {
      const { error: memberError } = await db.from<any>("group_members").insert(
        group.member_ids.map((userId) => ({
          group_id: groupData.id,
          user_id: userId,
        })),
      );

      if (memberError) throw memberError;
    }
  }
}

// ─── Service Exports ────────────────────────────────────────────────────────────

export const groupAssignmentService = {
  fetchProfiles,
  mapGroupTask,
  getTeacherGroups,
  getEligibleStudents,
  getStudentGroup,
  getGroupTasks,
  createGroupTask,
  updateGroupTaskStatus,
  getGroupMessages,
  sendGroupMessage,
  subscribeToGroupMessages,
  submitGroupAssignment,
  gradeGroupSubmission,
  updateGroupSettings,
  createGroups,
};

export const groupAssignmentTaskService = {
  deleteGroupTask,
};
