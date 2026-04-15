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
    _tenantId: string
  ): Promise<DomainLesson> {
    const { data, error } = await apiFetch(`/v1/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify({ type, title }),
    })

    if (error) throw new Error(error.message)
    return mapLesson(data)
  },

  async updateLesson(
    lessonId: string,
    _tenantId: string,
    data: Partial<DomainLesson>
  ): Promise<void> {
    // Map Domain model fields back to database columns if needed
    const dbUpdate: Record<string, unknown> = {}
    if (data.title !== undefined) dbUpdate.title = data.title
    if (data.isPublished !== undefined) dbUpdate.is_published = data.isPublished
    if (data.durationMinutes !== undefined) dbUpdate.duration_minutes = data.durationMinutes

    const { error } = await apiFetch(`/v1/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify(dbUpdate),
    })

    if (error) throw new Error(error.message)
  },

  async deleteLesson(lessonId: string, _tenantId: string): Promise<void> {
    const { error } = await apiFetch(`/v1/lessons/${lessonId}`, {
      method: 'DELETE',
    })
    if (error) throw new Error(error.message)
  },

  async reorderLessons(moduleId: string, lessonIds: string[], _tenantId: string): Promise<void> {
    const { error } = await apiFetch(`/v1/modules/${moduleId}/lessons/reorder`, {
      method: 'POST',
      body: JSON.stringify({ lesson_ids: lessonIds }),
    })

    if (error) throw new Error(error.message)
  },
}
