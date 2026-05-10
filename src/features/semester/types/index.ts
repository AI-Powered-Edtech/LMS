export interface Semester {
  id: string;
  tenant_id: string;
  name: string;
  academic_year: string;
  term: 1 | 2;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "closing" | "closed";
  created_at: string;
  updated_at: string;
}

export interface CourseGrade {
  course_name: string;
  final_score: number;
  grade_letter: string;
  teacher_name: string;
}

export interface ReportCardData {
  student_id: string;
  student_name: string;
  semester_name: string;
  courses: CourseGrade[];
  attendance_summary: {
    present: number;
    absent: number;
    sick: number;
    permission: number;
  };
  teacher_notes: string;
}

export interface SemesterFormData {
  name: string;
  academic_year: string;
  term: 1 | 2;
  start_date: string;
  end_date: string;
  status?: "draft" | "active" | "closing" | "closed";
}
