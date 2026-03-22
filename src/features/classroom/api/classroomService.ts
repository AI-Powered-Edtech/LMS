import { supabase } from '@/src/lib/supabase'

export interface Classroom {
  id: string
  name: string
  course_id?: string
  teacher_id: string
  join_code: string
  max_students?: number
  created_at: string
  teacher_name?: string
  student_count?: number
}

type UserRole = 'teacher' | 'student' | 'admin'

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
        .select('id, name, course_id, teacher_id, join_code, max_students, created_at')
        .eq('teacher_id', userId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    }

    if (role === 'admin') {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, course_id, teacher_id, join_code, max_students, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    }

    // Student: fetch via enrollments
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('class_id, classes( id, name, course_id, teacher_id, join_code, max_students, created_at )')
      .eq('student_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
    if (error) throw error
    return (enrollments
      ?.map((e) => (e as unknown as { classes: Classroom }).classes)
      .filter(Boolean) ?? []) as Classroom[]
  },

  /**
   * Create a new classroom with auto-generated join code.
   */
  async createClassroom(teacherId: string, name: string, tenantId: string): Promise<void> {
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { error } = await supabase.from('classes').insert({
      name,
      teacher_id: teacherId,
      join_code: joinCode,
      tenant_id: tenantId,
    })
    if (error) throw error
  },

  /**
   * Update classroom name.
   */
  async updateClassroom(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('classes').update({ name }).eq('id', id)
    if (error) throw error
  },

  /**
   * Join a classroom by join code.
   * Note: student_id and tenant_id are inferred by the RPC from auth context.
   */
  async joinClassroom(joinCode: string): Promise<void> {
    const { error } = await supabase.rpc('enroll_student', {
      p_join_code: joinCode.toUpperCase(),
    })

    if (error) {
      const message = error.message || ''

      if (message.includes('Invalid join code') || error.code === 'P0002') {
        throw new Error('Kode kelas tidak ditemukan')
      }
      if (
        message.includes('Already enrolled') ||
        message.includes('duplicate key value') ||
        message.includes('already exists') ||
        error.code === 'P0003' ||
        error.code === '23505' ||
        error.code === '23514'
      ) {
        throw new Error('Kamu sudah terdaftar di kelas ini')
      }
      if (message.includes('Class is full') || error.code === 'P0004') {
        throw new Error('Kelas sudah penuh')
      }
      if (message.includes('matching the ON CONFLICT specification')) {
        throw new Error('Sistem kelas sedang disinkronkan. Coba gabung lagi beberapa saat lagi.')
      }
      throw new Error('Gagal bergabung dengan kelas. Silakan coba lagi.')
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
    })
    if (error) throw error
  },

  /**
   * Unassign a course from a class.
   */
  async unassignCourseFromClass(courseId: string, classId: string): Promise<void> {
    const { error } = await supabase
      .from('course_classes')
      .delete()
      .eq('course_id', courseId)
      .eq('class_id', classId)
    if (error) throw error
  },

  /**
   * Fetch classes assigned to a specific course.
   */
  async fetchAssignedClassesForCourse(courseId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('course_classes')
      .select('class_id')
      .eq('course_id', courseId)

    if (error) throw error
    return data?.map((item) => item.class_id) || []
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  /**
   * Delete a classroom by ID.
   */
  async deleteClassroom(classId: string): Promise<void> {
    const { error } = await supabase.from('classes').delete().eq('id', classId)
    if (error) throw error
  },
}
