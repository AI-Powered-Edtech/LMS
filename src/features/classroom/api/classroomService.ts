import { api, apiFetch } from '@/src/lib/api'

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
  async fetchClassrooms(userId: string, role: UserRole, _tenantId: string): Promise<Classroom[]> {
    if (role === 'teacher') {
      const { data, error } = await apiFetch('/classes')
      if (error) throw error
      return data ?? []
    }

    if (role === 'admin') {
      const { data, error } = await apiFetch('/classes')
      if (error) throw error
      return data ?? []
    }

    // Student: fetch via enrollments
    const { data: enrollments, error } = await apiFetch('/enrollments')
    if (error) throw error
    return (enrollments
      ?.map((e: any) => (e as unknown as { classes: Classroom }).classes)
      .filter(Boolean) ?? []) as Classroom[]
  },

  /**
   * Create a new classroom with auto-generated join code.
   */
  async createClassroom(_teacherId: string, _name: string, _tenantId: string): Promise<void> {
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
    const { error } = await apiFetch('/classes')
    if (error) throw error
  },

  /**
   * Update classroom name.
   */
  async updateClassroom(_id: string, _name: string): Promise<void> {
    const { error } = await apiFetch('/classes')
    if (error) throw error
  },

  /**
   * Join a classroom by join code.
   * Note: student_id and tenant_id are inferred by the RPC from auth context.
   */
  async joinClassroom(joinCode: string): Promise<void> {
    const { error } = await apiFetch('/rpc/enroll_student', {
      method: 'POST',
      body: JSON.stringify({
        p_join_code: joinCode.toUpperCase(),
      }),
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
  async assignCourseToClass(_courseId: string, _classId: string, _tenantId: string): Promise<void> {
    const { error } = await apiFetch('/course_classes')
    if (error) throw error
  },

  /**
   * Unassign a course from a class.
   */
  async unassignCourseFromClass(
    _courseId: string,
    _classId: string,
    _tenantId: string
  ): Promise<void> {
    const { error } = await apiFetch('/course_classes')
    if (error) throw error
  },

  /**
   * Fetch classes assigned to a specific course.
   */
  async fetchAssignedClassesForCourse(_courseId: string): Promise<string[]> {
    const { data, error } = await apiFetch('/course_classes')

    if (error) throw error
    return data?.map((item: any) => item.class_id) || []
  },
  /**
   * Subscribe to realtime classroom changes.
   * Returns cleanup function.
   */
  subscribeToChanges(onUpdate: () => void): () => void {
    const channel = api
      .channel('classrooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_classes' }, onUpdate)
      .subscribe()

    return () => {
      api.removeChannel(channel)
    }
  },

  /**
   * Delete a classroom by ID.
   */
  async deleteClassroom(_classId: string): Promise<void> {
    const { error } = await apiFetch('/classes')
    if (error) throw error
  },
}
