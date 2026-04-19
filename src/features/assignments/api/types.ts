export interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface GroupTaskRow {
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
}

export interface CreateGroupInput {
  name: string;
  member_ids: string[];
}

export interface CreateGroupTaskInput {
  groupId: string;
  title?: string;
  taskId?: string;
  dueDate?: string;
  note?: string;
  attachmentUrl?: string;
}

export interface TeacherGroupEntry {
  id?: string;
  group_id: string;
  group_name: string;
  maxMembers: number;
  member_count: number;
  submission_status?: "not_started" | "draft" | "submitted" | "graded";
  submission_id?: string | null;
  grade?: number | null;
  average_grade?: number;
  members?: Array<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    role?: string;
  }>;
}

export interface GroupMessage {
  id: string;
  user_id: string;
  group_id: string;
  content: string;
  created_at: string;
  profiles?: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }[];
}

export interface EligibleStudent {
  user_id: string;
  display_name: string;
  already_assigned?: boolean;
}
