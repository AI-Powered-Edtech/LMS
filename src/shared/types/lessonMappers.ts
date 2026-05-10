import { validate } from "../lib/validate";
import { LessonRowSchema } from "../schemas";
import { DomainLesson } from "./lessonTypes";

export function mapLesson(row: unknown): DomainLesson {
  const r = validate(LessonRowSchema, row, "LessonRow");
  return {
    id: r.id,
    moduleId: r.module_id,
    title: r.title,
    type: r.type,
    orderIndex: r.order,
    isPublished: r.is_published,
    durationMinutes: r.duration_minutes,
    passingScore: r.passing_score,
    tenantId: r.tenant_id,
  };
}
