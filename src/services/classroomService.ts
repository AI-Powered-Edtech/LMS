import { supabase } from '../lib/supabase';

export interface Classroom {
    id: string;
    name: string;
    course_id?: string;
    teacher_id: string;
    join_code: string;
    max_students?: number;
    created_at: string;
    teacher_name?: string;
    student_count?: number;
}

export type UserRole = 'teacher' | 'student' | 'admin';

export const classroomService = {
    /**
     * Fetch classrooms based on user role.
     * - teacher: classes they teach
     * - admin: all classes in tenant
     * - student: enrolled classes
     */
    async fetchClassrooms(userId: string, role: UserRole, tenantId: string): Promise<Classroom[]> {
        if (role === 'teacher') {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', userId)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data ?? [];
        }

        if (role === 'admin') {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data ?? [];
        }

        // Student: fetch via enrollments
        const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select('class_id, classes(*)')
            .eq('student_id', userId)
            .eq('tenant_id', tenantId)
            .eq('status', 'ACTIVE');
        if (error) throw error;
        return enrollments?.map((e: any) => e.classes).filter(Boolean) ?? [];
    },

    /**
     * Create a new classroom with auto-generated join code.
     */
    async createClassroom(teacherId: string, name: string, tenantId: string): Promise<void> {
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { error } = await supabase.from('classes').insert({
            name,
            teacher_id: teacherId,
            join_code: joinCode,
            tenant_id: tenantId,
        });
        if (error) throw error;
    },

    /**
     * Update classroom name.
     */
    async updateClassroom(id: string, name: string): Promise<void> {
        const { error } = await supabase
            .from('classes')
            .update({ name })
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Join a classroom by join code.
     */
    async joinClassroom(studentId: string, joinCode: string, tenantId: string): Promise<void> {
        const { data: cls, error: findErr } = await supabase
            .from('classes')
            .select('id')
            .eq('join_code', joinCode.toUpperCase())
            .eq('tenant_id', tenantId)
            .single();

        if (findErr || !cls) throw new Error('Kode kelas tidak ditemukan');

        const { error: enrollErr } = await supabase.from('enrollments').insert({
            class_id: cls.id,
            student_id: studentId,
            status: 'ACTIVE',
            tenant_id: tenantId,
        });

        if (enrollErr) {
            if (enrollErr.code === '23505') throw new Error('Kamu sudah terdaftar di kelas ini');
            throw enrollErr;
        }
    },

    /**
     * Assign a course to a class.
     */
    async assignCourseToClass(courseId: string, classId: string, tenantId: string): Promise<void> {
        const { error } = await supabase.from('course_classes').insert({
            course_id: courseId,
            class_id: classId,
            tenant_id: tenantId,
        });
        if (error) throw error;
    },

    /**
     * Unassign a course from a class.
     */
    async unassignCourseFromClass(courseId: string, classId: string): Promise<void> {
        const { error } = await supabase
            .from('course_classes')
            .delete()
            .eq('course_id', courseId)
            .eq('class_id', classId);
        if (error) throw error;
    },

    /**
     * Fetch classes assigned to a specific course.
     */
    async fetchAssignedClassesForCourse(courseId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('course_classes')
            .select('class_id')
            .eq('course_id', courseId);

        if (error) throw error;
        return data?.map(item => item.class_id) || [];
    },

    /**
     * Subscribe to realtime classroom changes.
     * Returns cleanup function.
     */
    subscribeToChanges(onUpdate: () => void): () => void {
        const channel = supabase
            .channel('classrooms-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, onUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, onUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'course_classes' }, onUpdate)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    },
};
