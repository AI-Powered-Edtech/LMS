import { apiFetch } from '@/src/lib/api'
import { mapModule } from '@/src/shared/types/moduleMappers'
import { DomainModule } from '@/src/shared/types/moduleTypes'

/**
 * Module Service for Course Builder (refactored)
 */
export const builderModuleService = {
  async createModule(courseId: string, title: string, _tenantId: string): Promise<DomainModule> {
    const { data, error } = await apiFetch(`/v1/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    })

    if (error) throw new Error(error.message)
    return mapModule({ ...data, lessons: [] })
  },

  async updateModule(moduleId: string, _tenantId: string, data: { title?: string }): Promise<void> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title

    const { error } = await apiFetch(`/v1/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    })
    if (error) throw new Error(error.message)
  },

  async deleteModule(moduleId: string, _tenantId: string): Promise<void> {
    const { error } = await apiFetch(`/v1/modules/${moduleId}`, {
      method: 'DELETE',
    })
    if (error) throw new Error(error.message)
  },

  async reorderModules(courseId: string, moduleIds: string[], _tenantId: string): Promise<void> {
    const { error } = await apiFetch(`/v1/courses/${courseId}/modules/reorder`, {
      method: 'POST',
      body: JSON.stringify({ module_ids: moduleIds }),
    })

    if (error) throw new Error(error.message)
  },
}
