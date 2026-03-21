import { supabase } from '@/src/lib/supabase'
import { DomainBlock } from '@/src/domain/block/types'
import { mapBlock } from '@/src/domain/block/mappers'

/**
 * Block Service for Course Builder (refactored)
 */
export const builderBlockService = {
  async fetchLessonBlocks(lessonId: string, tenantId: string): Promise<DomainBlock[]> {
    const { data, error } = await supabase
      .from('lesson_resources')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('tenant_id', tenantId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)
    return (data || []).map(mapBlock)
  },

  async createBlock(lessonId: string, type: string, tenantId: string): Promise<DomainBlock> {
    const { count } = await supabase
      .from('lesson_resources')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)
      .eq('tenant_id', tenantId)

    const { data, error } = await supabase
      .from('lesson_resources')
      .insert({
        lesson_id: lessonId,
        type,
        order_index: count || 0,
        tenant_id: tenantId,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapBlock(data)
  },

  async updateBlock(blockId: string, tenantId: string, data: Partial<DomainBlock>): Promise<void> {
    const dbUpdate: any = {}
    if (data.title !== undefined) dbUpdate.title = data.title
    if (data.url !== undefined) dbUpdate.url = data.url
    if (data.content !== undefined) dbUpdate.content = data.content
    if (data.metadata !== undefined) dbUpdate.metadata = data.metadata
    if (data.orderIndex !== undefined) dbUpdate.order_index = data.orderIndex

    const { error } = await supabase
      .from('lesson_resources')
      .update(dbUpdate)
      .eq('id', blockId)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(error.message)
  },

  async deleteBlock(blockId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('lesson_resources')
      .delete()
      .eq('id', blockId)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(error.message)
  },

  async reorderBlocks(lessonId: string, blockIds: string[], tenantId: string): Promise<void> {
    // Optimized RPC call using WITH ORDINALITY
    const { error } = await supabase.rpc('rpc_reorder_lesson_resources', {
      p_lesson_id: lessonId,
      p_resource_ids: blockIds,
      p_tenant_id: tenantId,
    })

    if (error) throw new Error(error.message)
  },
}
