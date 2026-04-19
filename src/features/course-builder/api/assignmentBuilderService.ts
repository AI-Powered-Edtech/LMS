import { db } from "@/services/db";

// ============================================================
// Types (exported for use in AssignmentBlockEditor)
// ============================================================

export interface AssignmentBlockData {
  id?: string;
  title: string;
  instructions: string | null;
  max_points: number;
  max_attempts: number;
  is_published: boolean;
  due_date?: string | null;
}

// ============================================================
// Service (tenant-aware)
// ============================================================

export const builderAssignmentService = {
  async getAssignmentByLesson(
    lessonId: string,
    tenantId: string,
  ): Promise<AssignmentBlockData | null> {
    const { data, error } = await db
      .from<any>("assignments")
      .select(
        "id, lesson_id, course_id, tenant_id, title, instructions, max_points, max_attempts, is_published, due_date, created_at",
      )
      .eq("lesson_id", lessonId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as AssignmentBlockData | null;
  },

  async saveAssignmentData(
    lessonId: string,
    courseId: string,
    tenantId: string,
    data: AssignmentBlockData,
  ): Promise<AssignmentBlockData> {
    if (data.id) {
      const { data: result, error } = await db
        .from<any>("assignments")
        .update({
          title: data.title,
          instructions: data.instructions,
          max_points: data.max_points,
          max_attempts: data.max_attempts,
          is_published: data.is_published,
          due_date: data.due_date,
        })
        .eq("id", data.id)
        .eq("tenant_id", tenantId)
        .select(
          "id, lesson_id, course_id, tenant_id, title, instructions, max_points, max_attempts, is_published, due_date, created_at",
        )
        .single();
      if (error) throw new Error(error.message);
      return result as AssignmentBlockData;
    } else {
      const { data: result, error } = await db
        .from<any>("assignments")
        .insert({
          lesson_id: lessonId,
          course_id: courseId,
          tenant_id: tenantId,
          title: data.title,
          instructions: data.instructions,
          max_points: data.max_points,
          max_attempts: data.max_attempts,
          is_published: data.is_published,
          due_date: data.due_date,
        })
        .select(
          "id, lesson_id, course_id, tenant_id, title, instructions, max_points, max_attempts, is_published, due_date, created_at",
        )
        .single();
      if (error) throw new Error(error.message);
      return result as AssignmentBlockData;
    }
  },
};
