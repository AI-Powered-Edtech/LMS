import { supabase } from '@/src/services/supabase/client'
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
    const { count } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('module_id', moduleId)
      .eq('tenant_id', tenantId)

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        type,
        title,
        order: count || 0,
        is_published: false,
        tenant_id: tenantId,
      })
      .select()
      .single()

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

    const { error } = await supabase
      .from('lessons')
      .update(dbUpdate)
      .eq('id', lessonId)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(error.message)
  },

  async deleteLesson(lessonId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
  },

  async reorderLessons(moduleId: string, lessonIds: string[], tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('rpc_reorder_module_lessons', {
      p_module_id: moduleId,
      p_lesson_ids: lessonIds,
      p_tenant_id: tenantId,
    })

    if (error) throw new Error(error.message)
  },
}
