import { apiFetch } from '@/src/lib/api'
import { mapBlock } from '@/src/shared/types/blockMappers'
import { DomainBlock } from '@/src/shared/types/blockTypes'

/**
 * Block Service for Course Builder (refactored)
 */
export const builderBlockService = {
  async fetchLessonBlocks(lessonId: string, tenantId: string): Promise<DomainBlock[]> {
    const { data, error } = await apiFetch('/lesson_resources')

    if (error) throw new Error(error.message)
    return (data || []).map(mapBlock)
  },

  async createBlock(lessonId: string, type: string, tenantId: string): Promise<DomainBlock> {
    const { count } = await apiFetch('/lesson_resources')

    const { data, error } = await apiFetch('/lesson_resources')

    if (error) throw new Error(error.message)
    return mapBlock(data)
  },

  async updateBlock(blockId: string, tenantId: string, data: Partial<DomainBlock>): Promise<void> {
    const dbUpdate: Record<string, unknown> = {}
    if (data.title !== undefined) dbUpdate.title = data.title
    if (data.url !== undefined) dbUpdate.url = data.url
    if (data.content !== undefined) dbUpdate.content = data.content
    if (data.metadata !== undefined) dbUpdate.metadata = data.metadata
    if (data.orderIndex !== undefined) dbUpdate.order_index = data.orderIndex

    const { error } = await apiFetch('/lesson_resources')

    if (error) throw new Error(error.message)
  },

  async deleteBlock(blockId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/lesson_resources')

    if (error) throw new Error(error.message)
  },

  async reorderBlocks(lessonId: string, blockIds: string[], tenantId: string): Promise<void> {
    // Optimized RPC call using WITH ORDINALITY
    const { error } = await apiFetch('/rpc/rpc_reorder_lesson_resources', { method: 'POST', body: JSON.stringify({
          p_lesson_id: lessonId,
          p_resource_ids: blockIds,
          p_tenant_id: tenantId,
        }) })

    if (error) throw new Error(error.message)
  },
}
