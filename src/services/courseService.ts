import { supabase } from '../lib/supabase';

export interface Course {
    id: string;
    title: string;
    description: string | null;
    tenant_id: string;
    created_by: string;
    created_at?: string;
    updated_at?: string;
    assigned_classes?: {
        class_id: string;
        class: {
            name: string;
        }
    }[];
}

export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at'>;
export type CourseUpdate = Partial<CourseInsert>;

export interface FetchCoursesOptions {
    tenantId: string;
    page?: number;
    limit?: number;
    search?: string;
}

export const courseService = {
    /**
     * Fetches courses for a specific tenant with optional pagination and search.
     * RLS ensures users only see courses they have access to.
     */
    async fetchCourses({ tenantId, page = 1, limit = 10, search }: FetchCoursesOptions) {
        let query = supabase
            .from('courses')
            .select(`
                *,
                assigned_classes:course_classes(
                    class_id,
                    class:classes(name)
                )
            `, { count: 'exact' })
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        if (page && limit) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }

        return {
            courses: data || [],
            count: count || 0,
        };
    },

    /**
     * Gets a specific course by its ID.
     */
    async getCourseById(courseId: string, tenantId: string) {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .eq('tenant_id', tenantId)
            .single();

        if (error) {
            console.error('Error fetching course by ID:', error);
            throw error;
        }

        return data;
    },

    /**
     * Creates a new course.
     * The created_by field should ideally be set by the edge function/DB defaults using auth.uid(),
     * but we provide it here explicitly for completeness if the RLS allows it.
     */
    async createCourse(courseData: CourseInsert) {
        const { data, error } = await supabase
            .from('courses')
            .insert(courseData)
            .select()
            .single();

        if (error) {
            console.error('Error creating course:', error);
            throw error;
        }

        return data;
    },

    /**
     * Updates an existing course.
     */
    async updateCourse(courseId: string, updates: CourseUpdate, tenantId: string) {
        const { data, error } = await supabase
            .from('courses')
            .update(updates)
            .eq('id', courseId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) {
            console.error('Error updating course:', error);
            throw error;
        }

        return data;
    },

    /**
     * Deletes a course.
     */
    async deleteCourse(courseId: string, tenantId: string) {
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId)
            .eq('tenant_id', tenantId);

        if (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }
};
