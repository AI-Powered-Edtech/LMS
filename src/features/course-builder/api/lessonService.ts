import { supabase } from '@/services/supabase/client'
import { mapLesson } from '@/shared/types/lessonMappers'
import { DomainLesson } from '@/shared/types/lessonTypes'

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
    // Get next order using MAX+1 to avoid race conditions with COUNT pattern
    const { data: maxRow } = await supabase
      .from('lessons')
      .select('"order"')
      .eq('module_id', moduleId)
      .eq('tenant_id', tenantId)
      .order('"order"', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (maxRow?.order ?? -1) + 1

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        type,
        title,
        order: nextOrder,
        is_published: false,
        tenant_id: tenantId,
      })
      .select(
        'id, module_id, title, type, "order", is_published, duration_minutes, passing_score, tenant_id'
      )
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
