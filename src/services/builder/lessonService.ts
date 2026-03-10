import { supabase } from '../../lib/supabase';
import { DomainLesson } from '../../domain/lesson/types';
import { mapLesson } from '../../domain/lesson/mappers';

/**
 * Lesson Service for Course Builder (refactored)
 */
export const builderLessonService = {
    async createLesson(moduleId: string, type: string, title: string, tenantId: string): Promise<DomainLesson> {
        const { count } = await supabase
            .from('lessons')
            .select('id', { count: 'exact', head: true })
            .eq('module_id', moduleId);

        const { data, error } = await supabase
            .from('lessons')
            .insert({
                module_id: moduleId,
                type,
                title,
                "order": count || 0,
                is_published: false,
                tenant_id: tenantId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return mapLesson(data);
    },

    async updateLesson(lessonId: string, data: Partial<DomainLesson>): Promise<void> {
        // Map Domain model fields back to database columns if needed
        const dbUpdate: any = {};
        if (data.title !== undefined) dbUpdate.title = data.title;
        if (data.isPublished !== undefined) dbUpdate.is_published = data.isPublished;
        if (data.durationMinutes !== undefined) dbUpdate.duration_minutes = data.durationMinutes;

        const { error } = await supabase
            .from('lessons')
            .update(dbUpdate)
            .eq('id', lessonId);

        if (error) throw new Error(error.message);
    },

    async deleteLesson(lessonId: string): Promise<void> {
        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', lessonId);
        if (error) throw new Error(error.message);
    },

    async reorderLessons(moduleId: string, lessonIds: string[]): Promise<void> {
        const { error } = await supabase.rpc('rpc_reorder_module_lessons', {
            p_module_id: moduleId,
            p_lesson_ids: lessonIds
        });

        if (error) throw new Error(error.message);
    }
};
