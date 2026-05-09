import { getClassSectionStudentsByEntityId } from '@/features/classroom/api/classSectionAdapter'
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

  /** Fetch enrolled students for a class (or rombel; auto-detected via adapter). */
  // Issue #325 F2: routes through classSectionAdapter for dual-source dispatch.
  // Caller still passes the same classId (which can now be either a rombel.id
  // or a legacy classes.id); adapter handles the lookup + tenant scoping.
  async fetchClassStudents(classId: string, tenantId: string): Promise<ClassStudent[]> {
    const sectionStudents = await getClassSectionStudentsByEntityId(classId, tenantId)
    // Adapter returns ClassSectionStudent (student_id, full_name, email, sorted).
    // ClassStudent is a narrower shape: drop email, preserve sort order.
    return sectionStudents.map((s) => ({
      student_id: s.student_id,
      full_name: s.full_name,
    }))
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
