import { DomainLesson } from './lessonTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapLesson(row: any): DomainLesson {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    type: row.type,
    orderIndex: row.order,
    isPublished: row.is_published,
    durationMinutes: row.duration_minutes,
    passingScore: row.passing_score,
    tenantId: row.tenant_id,
  }
}
