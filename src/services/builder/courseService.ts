import { supabase } from '../../lib/supabase';
import { DomainCourse } from '../../domain/course/types';
import { mapCourse } from '../../domain/course/mappers';
import { DomainModule } from '../../domain/module/types';
import { mapModule } from '../../domain/module/mappers';
import { BuilderLesson } from '../courseBuilderService';

/**
 * Course Service for Course Builder (refactored)
 */
export const builderCourseService = {
    /** 
     * Stage 1: Fetch modules + lessons (no blocks) 
     * Refactored to return Domain Models
     */
    async fetchCourseStructure(courseId: string, tenantId: string): Promise<{
        course: DomainCourse;
        modules: DomainModule[];
    }> {
        const { data: course, error: courseErr } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .eq('tenant_id', tenantId)
            .single();

        if (courseErr || !course) throw new Error('Course not found');

        const { data: modules, error: modErr } = await supabase
            .from('course_modules')
            .select(`
        *,
        lessons (*)
      `)
            .eq('course_id', courseId)
            .eq('tenant_id', tenantId)
            .order('order', { ascending: true });

        if (modErr) throw new Error(modErr.message);

        // Sort lessons within each module
        const sorted = (modules || []).map((m: any) => ({
            ...m,
            description: null,
            lessons: (m.lessons || []).sort(
                (a: BuilderLesson, b: BuilderLesson) => a.order - b.order
            ),
        }));

        return {
            course: mapCourse(course),
            modules: sorted.map(mapModule)
        };
    },

    /** Use RPC to publish a course and update status/publishing timestamps */
    async publishCourse(courseId: string, tenantId: string): Promise<void> {
        const { error } = await supabase.rpc('rpc_publish_course', {
            p_course_id: courseId,
            p_tenant_id: tenantId
        });
        if (error) throw new Error(error.message);
    },

    /** Manually drafted via update instead of full RPC for now, for completeness */
    async draftCourse(courseId: string, tenantId: string): Promise<void> {
        const { error } = await supabase
            .from('courses')
            .update({ status: 'draft' })
            .eq('id', courseId)
            .eq('tenant_id', tenantId);
        if (error) throw new Error(error.message);
    }
};
