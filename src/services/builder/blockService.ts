import { supabase } from '../../lib/supabase';
import { DomainBlock } from '../../domain/block/types';
import { mapBlock } from '../../domain/block/mappers';

/**
 * Block Service for Course Builder (refactored)
 */
export const builderBlockService = {
    async fetchLessonBlocks(lessonId: string): Promise<DomainBlock[]> {
        const { data, error } = await supabase
            .from('lesson_resources')
            .select('*')
            .eq('lesson_id', lessonId)
            .order('order_index', { ascending: true });

        if (error) throw new Error(error.message);
        return (data || []).map(mapBlock);
    },

    async createBlock(lessonId: string, type: string, tenantId: string): Promise<DomainBlock> {
        const { count } = await supabase
            .from('lesson_resources')
            .select('id', { count: 'exact', head: true })
            .eq('lesson_id', lessonId);

        const { data, error } = await supabase
            .from('lesson_resources')
            .insert({
                lesson_id: lessonId,
                type,
                order_index: count || 0,
                tenant_id: tenantId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return mapBlock(data);
    },

    async updateBlock(blockId: string, data: Partial<DomainBlock>): Promise<void> {
        const dbUpdate: any = {};
        if (data.title !== undefined) dbUpdate.title = data.title;
        if (data.url !== undefined) dbUpdate.url = data.url;
        if (data.content !== undefined) dbUpdate.content = data.content;
        if (data.metadata !== undefined) dbUpdate.metadata = data.metadata;
        if (data.orderIndex !== undefined) dbUpdate.order_index = data.orderIndex;

        const { error } = await supabase
            .from('lesson_resources')
            .update(dbUpdate)
            .eq('id', blockId);

        if (error) throw new Error(error.message);
    },

    async deleteBlock(blockId: string): Promise<void> {
        const { error } = await supabase
            .from('lesson_resources')
            .delete()
            .eq('id', blockId);

        if (error) throw new Error(error.message);
    },

    async reorderBlocks(lessonId: string, blockIds: string[]): Promise<void> {
        // Optimized RPC call using WITH ORDINALITY
        const { error } = await supabase.rpc('rpc_reorder_lesson_resources', {
            p_lesson_id: lessonId,
            p_resource_ids: blockIds
        });

        if (error) throw new Error(error.message);
    }
};
