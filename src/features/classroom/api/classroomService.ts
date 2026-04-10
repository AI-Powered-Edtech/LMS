import { getRealtimeProvider } from '@/services/realtime'
import { supabase } from '@/services/supabase/client'

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

export interface EnrolledStudent {
  id: string
  student_id: string
  full_name: string
  email: string
  enrolled_at: string
  status: string
}

interface ClassroomRow {
  id: string
  name: string
  course_id?: string
  teacher_id: string
  join_code: string
  max_students?: number
  created_at: string
}

interface EnrollmentRow {
  id: string
  class_id: string
  student_id: string
  status: string
  joined_at: string
}

interface ProfileRow {
  id: string
  full_name: string | null
  email: string | null
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
    const classroomColumns = 'id, name, course_id, teacher_id, join_code, max_students, created_at'

    if (role === 'teacher') {
      const { data, error } = await supabase
        .from('classes')
        .select(classroomColumns)
        .eq('teacher_id', userId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    }

    if (role === 'admin') {
      const { data, error } = await supabase
        .from('classes')
        .select(classroomColumns)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    }

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('student_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
    if (error) throw error

    const classIds = (enrollments ?? []).map((item) => item.class_id).filter(Boolean)
    if (classIds.length === 0) return []

    const { data: classrooms, error: classroomError } = await supabase
      .from('classes')
      .select(classroomColumns)
      .eq('tenant_id', tenantId)
      .in('id', classIds)
      .order('created_at', { ascending: false })

    if (classroomError) throw classroomError
    return ((classrooms ?? []) as ClassroomRow[]).sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )
  },

  /**
   * Create a new classroom with auto-generated join code.
   */
  async createClassroom(teacherId: string, name: string, tenantId: string): Promise<void> {
    // SECURITY: Use crypto.getRandomValues() for cryptographically secure join codes to prevent predictability
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let joinCode = ''
    const randomBytes = new Uint8Array(16)
    while (joinCode.length < 6) {
      globalThis.crypto.getRandomValues(randomBytes)
      for (let i = 0; i < randomBytes.length; i++) {
        // 252 is the highest multiple of 36 < 256 to avoid modulo bias
        if (randomBytes[i] < 252 && joinCode.length < 6) {
          joinCode += charset[randomBytes[i] % 36]
        }
      }
    }
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
  async updateClassroom(id: string, name: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('classes')
      .update({ name })
      .eq('id', id)
      .eq('tenant_id', tenantId)
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
  async unassignCourseFromClass(
    courseId: string,
    classId: string,
    tenantId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('course_classes')
      .delete()
      .eq('course_id', courseId)
      .eq('class_id', classId)
      .eq('tenant_id', tenantId)
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
  subscribeToChanges(tenantId: string, onUpdate: () => void): () => void {
    const channel = getRealtimeProvider()
      .channel('classrooms-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes', filter: `tenant_id=eq.${tenantId}` },
        onUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments', filter: `tenant_id=eq.${tenantId}` },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_classes',
          filter: `tenant_id=eq.${tenantId}`,
        },
        onUpdate
      )
      .subscribe()

    return () => {
      void getRealtimeProvider().removeChannel(channel)
    }
  },

  /**
   * Delete a classroom by ID.
   */
  async deleteClassroom(classId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)
      .eq('tenant_id', tenantId)
    if (error) throw error
  },

  /**
   * Count active enrollments for a class.
   */
  async getActiveEnrollmentCount(classId: string, tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')

    if (error) throw error
    return count ?? 0
  },

  /**
   * Fetch enrolled students with profile info for class management.
   */
  async getEnrolledStudents(classId: string, tenantId: string): Promise<EnrolledStudent[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, student_id, status, joined_at')
      .eq('class_id', classId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
    if (error) throw error

    const enrollments = (data ?? []) as EnrollmentRow[]
    if (enrollments.length === 0) return []

    const studentIds = enrollments.map((row) => row.student_id).filter(Boolean)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .in('id', studentIds)

    if (profileError) throw profileError

    const profileMap = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    )

    return enrollments.map((row) => {
      const profile = profileMap.get(row.student_id)
      return {
        id: row.id,
        student_id: row.student_id,
        full_name: profile?.full_name || 'Unnamed',
        email: profile?.email || '-',
        enrolled_at: row.joined_at,
        status: row.status,
      }
    })
  },

  /**
   * Remove a student from a class (soft delete).
   */
  async removeStudent(enrollmentId: string, removedBy: string, tenantId: string): Promise<void> {
    void removedBy
    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'REMOVED' })
      .eq('id', enrollmentId)
      .eq('tenant_id', tenantId)

    if (error) throw error
  },
}
