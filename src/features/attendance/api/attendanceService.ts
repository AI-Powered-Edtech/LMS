import { supabase } from '@/src/services/supabase/client'

import type { AttendanceRecord, ClassOption, ClassStudent, UpsertAttendanceParams } from '../types'

/**
 * Service layer for attendance operations.
 * All Supabase calls for the attendance feature go through here.
 */
export const attendanceService = {
  /** Fetch classes taught by a specific teacher */
  async fetchTeacherClasses(tenantId: string, teacherId: string): Promise<ClassOption[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('teacher_id', teacherId)
      .order('name')

    if (error) throw error
    return (data ?? []) as ClassOption[]
  },

  /** Fetch enrolled students for a class */
  async fetchClassStudents(classId: string): Promise<ClassStudent[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('student_id, profiles!enrollments_student_id_fkey(full_name)')
      .eq('class_id', classId)
      .eq('status', 'ACTIVE')
      .order('profiles(full_name)')

    if (error) throw error

    return (
      (data ?? []) as unknown as Array<{
        student_id: string
        profiles: { full_name: string } | { full_name: string }[]
      }>
    ).map((row) => ({
      student_id: row.student_id,
      full_name: Array.isArray(row.profiles)
        ? (row.profiles[0]?.full_name ?? 'Siswa')
        : (row.profiles?.full_name ?? 'Siswa'),
    }))
  },

  /** Fetch attendance records for a class */
  async fetchAttendanceRecords(
    tenantId: string,
    classId: string,
    limit = 30
  ): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(
        'id, tenant_id, class_id, scan_date, scanned_by, present_count, absent_count, sick_count, permit_count, details, created_at, classes(name)'
      )
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .order('scan_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []) as unknown as AttendanceRecord[]
  },

  /** Fetch today's attendance record for a class (if exists) */
  async fetchTodayRecord(tenantId: string, classId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
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
    const { data, error } = await supabase.rpc('upsert_attendance_record', {
      p_class_id: params.class_id,
      p_scan_date: params.scan_date,
      p_details: params.details,
      p_present: params.present_count,
      p_absent: params.absent_count,
      p_sick: params.sick_count,
      p_permit: params.permit_count,
    })

    if (error) throw error
    return data as string
  },

  /** Delete an attendance record */
  async deleteAttendance(id: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw error
  },
}
