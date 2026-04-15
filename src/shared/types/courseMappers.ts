import { validate } from '../lib/validate'
import { CourseRowSchema } from '../schemas'
import { DomainCourse } from './courseTypes'

export function mapCourse(row: unknown): DomainCourse {
  const r = validate(CourseRowSchema, row, 'CourseRow')
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    tenantId: r.tenant_id,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  }
}
