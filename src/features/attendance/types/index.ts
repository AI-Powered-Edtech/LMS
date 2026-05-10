/** Attendance feature types */

export interface AttendanceStudentDetail {
  /** Student profile ID */
  student_id: string;
  /** Student display name */
  name: string;
  /** Attendance status for this student */
  status: "hadir" | "sakit" | "izin" | "alpha";
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  class_id: string;
  scan_date: string;
  scanned_by: string;
  present_count: number;
  absent_count: number;
  sick_count: number;
  permit_count: number;
  details: AttendanceStudentDetail[];
  created_at: string;
  /** Joined class name */
  classes?: { name: string } | { name: string }[];
}

export interface UpsertAttendanceParams {
  class_id: string;
  scan_date: string;
  details: AttendanceStudentDetail[];
  present_count: number;
  absent_count: number;
  sick_count: number;
  permit_count: number;
}

export interface ClassOption {
  id: string;
  name: string;
}

export interface ClassStudent {
  student_id: string;
  full_name: string;
}
