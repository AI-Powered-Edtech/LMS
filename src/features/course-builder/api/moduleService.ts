import { db } from '@/services/db'
import { mapModule } from '@/shared/types/moduleMappers'
import { DomainModule } from '@/shared/types/moduleTypes'

/**
 * Module Service for Course Builder (refactored)
 */
export const builderModuleService = {
  async createModule(courseId: string, title: string, tenantId: string): Promise<DomainModule> {
    // Get next order using MAX+1 to avoid race conditions with COUNT pattern
    const { data: maxRow } = await db
      .from('course_modules')
      .select('"order"')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .order('"order"', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (maxRow?.order ?? -1) + 1

    const { data, error } = await db
      .from('course_modules')
      .insert({
        course_id: courseId,
        title,
        order: nextOrder,
        tenant_id: tenantId,
      })
      .select('id, course_id, title, "order", tenant_id')
      .single()

    if (error) throw new Error(error.message)
    return mapModule({ ...data, lessons: [] })
  },

  async updateModule(
    moduleId: string,
    tenantId: string,
    data: { title?: string; description?: string }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description

    const { error } = await db
      .from('course_modules')
      .update(updateData)
      .eq('id', moduleId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
  },

  async deleteModule(moduleId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('course_modules')
      .delete()
      .eq('id', moduleId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
  },

  async reorderModules(courseId: string, moduleIds: string[], tenantId: string): Promise<void> {
    // Optimized RPC Call using WITH ORDINALITY
    const { error } = await db.rpc('rpc_reorder_course_modules', {
      p_course_id: courseId,
      p_module_ids: moduleIds,
      p_tenant_id: tenantId,
    })

    if (error) throw new Error(error.message)
  },
}
