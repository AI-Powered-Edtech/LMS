import { supabase } from '@/src/lib/supabase';
import { DomainModule } from '@/src/domain/module/types';
import { mapModule } from '@/src/domain/module/mappers';

/**
 * Module Service for Course Builder (refactored)
 */
export const builderModuleService = {
    async createModule(courseId: string, title: string, tenantId: string): Promise<DomainModule> {
        // Get next order
        const { count } = await supabase
            .from('course_modules')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', courseId)
            .eq('tenant_id', tenantId);

        const { data, error } = await supabase
            .from('course_modules')
            .insert({
                course_id: courseId,
                title,
                "order": count || 0,
                tenant_id: tenantId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return mapModule({ ...data, lessons: [] });
    },

    async updateModule(moduleId: string, tenantId: string, data: { title?: string }): Promise<void> {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;

        const { error } = await supabase
            .from('course_modules')
            .update(updateData)
            .eq('id', moduleId)
            .eq('tenant_id', tenantId);
        if (error) throw new Error(error.message);
    },

    async deleteModule(moduleId: string, tenantId: string): Promise<void> {
        const { error } = await supabase
            .from('course_modules')
            .delete()
            .eq('id', moduleId)
            .eq('tenant_id', tenantId);
        if (error) throw new Error(error.message);
    },

    async reorderModules(courseId: string, moduleIds: string[], tenantId: string): Promise<void> {
        // Optimized RPC Call using WITH ORDINALITY
        const { error } = await supabase.rpc('rpc_reorder_course_modules', {
            p_course_id: courseId,
            p_module_ids: moduleIds,
            p_tenant_id: tenantId
        });

        if (error) throw new Error(error.message);
    }
};
