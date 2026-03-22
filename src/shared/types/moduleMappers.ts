import { DomainModule } from './moduleTypes'
import { ModuleRowSchema } from '../schemas'
import { validate } from '../lib/validate'
import { mapLesson } from './lessonMappers'

export function mapModule(row: unknown): DomainModule {
  const r = validate(ModuleRowSchema, row, 'ModuleRow')
  return {
    id: r.id,
    courseId: r.course_id,
    title: r.title,
    orderIndex: r.order,
    tenantId: r.tenant_id,
    lessons: r.lessons ? r.lessons.map(mapLesson) : [],
  }
}
