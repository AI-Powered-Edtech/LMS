import { apiFetch } from '@/src/lib/api'
import { mapBlock } from '@/src/shared/types/blockMappers'
import { DomainBlock } from '@/src/shared/types/blockTypes'

/**
 * Block Service for Course Builder (refactored)
 */
export const builderBlockService = {
  async fetchLessonBlocks(lessonId: string, _tenantId: string): Promise<DomainBlock[]> {
    const { data, error } = await apiFetch(`/v1/lessons/${lessonId}/blocks`)

    if (error) throw new Error(error.message)
    return (data || []).map(mapBlock)
  },

  async createBlock(lessonId: string, type: string, _tenantId: string): Promise<DomainBlock> {
    const { data, error } = await apiFetch(`/v1/lessons/${lessonId}/blocks`, {
      method: 'POST',
      body: JSON.stringify({
        type,
        title: `New ${type}`
      })
    })

    if (error) throw new Error(error.message)
    return mapBlock(data)
  },

  async updateBlock(blockId: string, _tenantId: string, data: Partial<DomainBlock>): Promise<void> {
    const dbUpdate: Record<string, unknown> = {}
    if (data.title !== undefined) dbUpdate.title = data.title
    if (data.url !== undefined) dbUpdate.url = data.url
    if (data.content !== undefined) dbUpdate.content = data.content
    if (data.metadata !== undefined) dbUpdate.metadata = data.metadata
    if (data.orderIndex !== undefined) dbUpdate.order_index = data.orderIndex

    const { error } = await apiFetch(`/v1/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(dbUpdate)
    })

    if (error) throw new Error(error.message)
  },

  async deleteBlock(blockId: string, _tenantId: string): Promise<void> {
    const { error } = await apiFetch(`/v1/blocks/${blockId}`, {
      method: 'DELETE'
    })

    if (error) throw new Error(error.message)
  },

  async reorderBlocks(lessonId: string, blockIds: string[], _tenantId: string): Promise<void> {
    const { error } = await apiFetch(`/v1/lessons/${lessonId}/blocks/reorder`, {
      method: 'POST',
      body: JSON.stringify({
        block_ids: blockIds
      })
    })

    if (error) throw new Error(error.message)
  },
}
