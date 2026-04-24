import { db } from '@/services/db'

import type { AttendanceRecord, ClassOption, ClassStudent, UpsertAttendanceParams } from '../types'

/**
 * Service layer for attendance operations.
 * All database calls for the attendance feature go through here.
 */
export const attendanceService = {
  /** Fetch classes taught by a specific teacher */
  async fetchTeacherClasses(tenantId: string, teacherId: string): Promise<ClassOption[]> {
    const { data, error } = await db
      .from('classes')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('teacher_id', teacherId)
      .order('name')

    if (error) throw error
    return (data ?? []) as ClassOption[]
  },

  /** Fetch enrolled students for a class */
  // FIXED: Added tenantId parameter to enforce tenant scoping on enrollments query
  async fetchClassStudents(classId: string, tenantId: string): Promise<ClassStudent[]> {
    // VIL generic data API does not support Supabase-style nested relational
    // selects (`profiles!fk(full_name)`). Fetch enrollments first, then hydrate
    // full names from `profiles` with a second query.
    const { data: enrollmentsRaw, error } = await db
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      // Scope enrollment query to tenant to prevent cross-tenant data access.
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')

    if (error) throw error

    const enrollments = (enrollmentsRaw ?? []) as Array<{ student_id: string }>
    const studentIds = Array.from(
      new Set(enrollments.map((e) => e.student_id).filter(Boolean)),
    )

    let nameById = new Map<string, string>()
    if (studentIds.length > 0) {
      const { data: profilesRaw, error: profilesError } = await db
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)
      if (profilesError) throw profilesError
      nameById = new Map(
        ((profilesRaw ?? []) as Array<{ id: string; full_name: string | null }>).map(
          (p) => [p.id, p.full_name ?? 'Siswa'],
        ),
      )
    }

    const students: ClassStudent[] = enrollments.map((row) => ({
      student_id: row.student_id,
      full_name: nameById.get(row.student_id) ?? 'Siswa',
    }))
    // Sort alphabetically by full_name (was previously handled by the server).
    students.sort((a, b) => a.full_name.localeCompare(b.full_name))
    return students
  },

  /** Fetch attendance records for a class */
  async fetchAttendanceRecords(
    tenantId: string,
    classId: string,
    limit = 30
  ): Promise<AttendanceRecord[]> {
    // VIL generic data API does not support Supabase-style nested relational
    // selects (`classes(name)`). Fetch attendance records first, then hydrate
    // class name separately (only one class here, so a single lookup suffices).
    const { data, error } = await db
      .from('attendance_records')
      .select(
        'id, tenant_id, class_id, scan_date, scanned_by, present_count, absent_count, sick_count, permit_count, details, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .order('scan_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    const records = (data ?? []) as Array<Record<string, unknown>>
    if (records.length === 0) return [] as unknown as AttendanceRecord[]

    const { data: classRow } = await db
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    const className = (classRow as { name?: string } | null)?.name ?? ''

    return records.map((r) => ({
      ...r,
      classes: { name: className },
    })) as unknown as AttendanceRecord[]
  },

  /** Fetch today's attendance record for a class (if exists) */
  async fetchTodayRecord(tenantId: string, classId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await db
      .from('attendance_records')
      .select(
        'id, tenant_id, class_id, scan_date, scanned_by, present_count, absent_count, sick_count, permit_count, details, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .eq('scan_date', today)
      .maybeSingle()

    if (error) throw error
    return data as unknown as AttendanceRecord | null
  },

  /** Upsert (create or update) an attendance record via RPC */
  async upsertAttendance(params: UpsertAttendanceParams): Promise<string> {
    const { data, error } = await db.rpc('upsert_attendance_record', {
      p_class_id: params.class_id,
      p_scan_date: params.scan_date,
      p_details: params.details,
      p_present: params.present_count,
      p_absent: params.absent_count,
      p_sick: params.sick_count,
      p_permit: params.permit_count,
    })

    if (error) throw error
    return (data as unknown) as string
  },

  /** Delete an attendance record */
  async deleteAttendance(id: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('attendance_records')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw error
  },
}
