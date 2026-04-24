import { db } from '@/services/db'

export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa'

export interface RombelAttendanceRecord {
  id: string
  tenant_id: string
  rombel_id: string
  student_id: string
  attendance_date: string
  status: AttendanceStatus
  notes: string | null
  recorded_by: string | null
  recorded_at: string
}

export const rombelAttendanceService = {
  async getForDay(rombelId: string, date: string): Promise<RombelAttendanceRecord[]> {
    const { data, error } = await db
      .from<Array<RombelAttendanceRecord>>('rombel_attendance')
      .select('*')
      .eq('rombel_id', rombelId)
      .eq('attendance_date', date)
    if (error) throw error
    return (data ?? []) as RombelAttendanceRecord[]
  },

  async bulkRecord(input: {
    tenantId: string
    rombelId: string
    attendanceDate: string
    recorderId: string
    records: Array<{ student_id: string; status: AttendanceStatus; notes?: string }>
  }): Promise<number> {
    const { data, error } = await db.rpc('bulk_record_attendance', {
      p_tenant_id: input.tenantId,
      p_rombel_id: input.rombelId,
      p_attendance_date: input.attendanceDate,
      p_recorder_id: input.recorderId,
      p_records: input.records,
    })
    if (error) throw error
    return (data as unknown) as number
  },
}
