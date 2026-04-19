import { db } from "@/services/db";
import { captureError } from "@/utils/sentry";

export interface UserDataExport {
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  enrollments: Array<{
    id: string;
    class_id: string;
    student_id: string;
    status: string;
    joined_at: string;
  }>;
  progress: Array<{
    id: string;
    total_xp: number;
    completed_lessons_count: number;
    quiz_attempts: { quiz_id: string; score: number }[];
    achievements: {
      id: string;
      earned_at: string;
      name: string;
      icon: string;
    }[];
    course_progress: {
      id: string;
      course_id: string;
      total_lessons: number;
      completed_lessons: number;
    }[];
  }>;
  grades: Array<{
    id: string;
    student_id: string;
    course_id: string;
    grade: number;
  }>;
  messages: Array<{
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    sent_at: string;
  }>;
  certificates: Array<{
    id: string;
    name: string;
    file_url: string;
    issued_at: string;
  }>;
  exportedAt: string;
}

// ─── Export User Data ────────────────────────────────────────────────────────

export async function exportUserData(
  userId: string,
  tenantId: string,
): Promise<UserDataExport | null> {
  try {
    const { data: profile } = await db
      .from<{
        id: string;
        full_name: string | null;
        email: string | null;
      }>("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: enrollments } = await db
      .from<
        Array<{
          id: string;
          class_id: string;
          student_id: string;
          status: string;
          joined_at: string;
        }>
      >("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    const { data: progress } = await db
      .from<
        Array<{
          id: string;
          total_xp: number;
          completed_lessons_count: number;
          quiz_attempts: { quiz_id: string; score: number }[];
          achievements: {
            id: string;
            earned_at: string;
            name: string;
            icon: string;
          }[];
          course_progress: {
            id: string;
            course_id: string;
            total_lessons: number;
            completed_lessons: number;
          }[];
        }>
      >("student_progress_bundle")
      .eq("p_student_id", userId);

    const { data: grades } = await db
      .from<
        Array<{
          id: string;
          student_id: string;
          course_id: string;
          grade: number;
        }>
      >("grades")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .limit(1000);

    const { data: messages } = await db
      .from<
        Array<{
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          sent_at: string;
        }>
      >("messages")
      .select("*")
      .eq("sender_id", userId)
      .eq("tenant_id", tenantId)
      .limit(1000);

    const { data: certificates } = await db
      .from<
        Array<{ id: string; name: string; file_url: string; issued_at: string }>
      >("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .limit(1000);

    const exportedAt = new Date().toISOString();

    return {
      profile: profile ?? null,
      enrollments: enrollments ?? [],
      progress: progress ?? [],
      grades: grades ?? [],
      messages: messages ?? [],
      certificates: certificates ?? [],
      exportedAt,
    };
  } catch (err) {
    captureError(err, { tags: { feature: "data-export" } });
    return null;
  }
}

export function downloadExport(data: UserDataExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `edusync-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Request Account Deletion ─────────────────────────────────────────────────

export async function requestAccountDeletion(
  userId: string,
  reason: string,
): Promise<boolean> {
  try {
    const { error } = await db.from("account_deletion_requests").insert({
      user_id: userId,
      reason,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return true;
  } catch (err) {
    captureError(err, { tags: { feature: "account-deletion" } });
    return false;
  }
}
