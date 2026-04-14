import { apiFetch } from '@/src/lib/api'
import { mapModule } from '@/src/shared/types/moduleMappers'
import { DomainModule } from '@/src/shared/types/moduleTypes'

/**
 * Module Service for Course Builder (refactored)
 */
export const builderModuleService = {
  async createModule(courseId: string, title: string, tenantId: string): Promise<DomainModule> {
    // Get next order
    const { count } = await apiFetch('/course_modules')

    const { data, error } = await apiFetch('/course_modules')

    if (error) throw new Error(error.message)
    return mapModule({ ...data, lessons: [] })
  },

  async updateModule(moduleId: string, tenantId: string, data: { title?: string }): Promise<void> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title

    const { error } = await apiFetch('/course_modules')
    if (error) throw new Error(error.message)
  },

  async deleteModule(moduleId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/course_modules')
    if (error) throw new Error(error.message)
  },

  async reorderModules(courseId: string, moduleIds: string[], tenantId: string): Promise<void> {
    // Optimized RPC Call using WITH ORDINALITY
    const { error } = await apiFetch('/rpc/rpc_reorder_course_modules', { method: 'POST', body: JSON.stringify({
          p_course_id: courseId,
          p_module_ids: moduleIds,
          p_tenant_id: tenantId,
        }) })

    if (error) throw new Error(error.message)
  },
}
