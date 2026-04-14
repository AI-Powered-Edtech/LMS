import { apiFetch } from '@/src/lib/api'
import { mapLesson } from '@/src/shared/types/lessonMappers'
import { DomainLesson } from '@/src/shared/types/lessonTypes'

/**
 * Lesson Service for Course Builder (refactored)
 */
export const builderLessonService = {
  async createLesson(
    moduleId: string,
    type: string,
    title: string,
    tenantId: string
  ): Promise<DomainLesson> {
    const { count } = await apiFetch('/lessons')

    const { data, error } = await apiFetch('/lessons')

    if (error) throw new Error(error.message)
    return mapLesson(data)
  },

  async updateLesson(
    lessonId: string,
    tenantId: string,
    data: Partial<DomainLesson>
  ): Promise<void> {
    // Map Domain model fields back to database columns if needed
    const dbUpdate: Record<string, unknown> = {}
    if (data.title !== undefined) dbUpdate.title = data.title
    if (data.isPublished !== undefined) dbUpdate.is_published = data.isPublished
    if (data.durationMinutes !== undefined) dbUpdate.duration_minutes = data.durationMinutes

    const { error } = await apiFetch('/lessons')

    if (error) throw new Error(error.message)
  },

  async deleteLesson(lessonId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/lessons')
    if (error) throw new Error(error.message)
  },

  async reorderLessons(moduleId: string, lessonIds: string[], tenantId: string): Promise<void> {
    const { error } = await apiFetch('/rpc/rpc_reorder_module_lessons', { method: 'POST', body: JSON.stringify({
          p_module_id: moduleId,
          p_lesson_ids: lessonIds,
          p_tenant_id: tenantId,
        }) })

    if (error) throw new Error(error.message)
  },
}
