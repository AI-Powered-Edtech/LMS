import { DomainLesson } from './lessonTypes'
import { LessonRowSchema } from '../schemas'
import { validate } from '../lib/validate'

export function mapLesson(row: unknown): DomainLesson {
  const r = validate(LessonRowSchema, row, 'LessonRow')
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
  }
}
