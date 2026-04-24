import { db } from '@/services/db'

import type { ReportCardData, Semester, SemesterFormData } from '../types'

export async function fetchSemesters(tenantId: string): Promise<Semester[]> {
  const { data, error } = await db
    .from('semesters')
    .select(
      'id, tenant_id, name, academic_year_id, term, start_date, end_date, status, created_at, updated_at'
    )
    .eq('tenant_id', tenantId)
    .order('academic_year_id', { ascending: false })
    .order('term', { ascending: false })

  if (error) throw error
  return (data ?? []) as Semester[]
}

export async function fetchSemesterById(id: string, tenantId: string): Promise<Semester | null> {
  const { data, error } = await db
    .from('semesters')
    .select(
      'id, tenant_id, name, academic_year_id, term, start_date, end_date, status, created_at, updated_at'
    )
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error
  return data as Semester | null
}

export async function createSemester(
  formData: SemesterFormData,
  tenantId: string
): Promise<Semester> {
  const { data, error } = await db
    .from('semesters')
    .insert({
      tenant_id: tenantId,
      name: formData.name,
      academic_year_id: formData.academic_year_id,
      term: formData.term,
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: formData.status ?? 'draft',
    })
    .select(
      'id, tenant_id, name, academic_year_id, term, start_date, end_date, status, created_at, updated_at'
    )
    .single()

  if (error) throw error
  return data as Semester
}

export async function updateSemester(
  id: string,
  updates: Partial<SemesterFormData>,
  tenantId: string
): Promise<Semester> {
  const { data, error } = await db
    .from('semesters')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(
      'id, tenant_id, name, academic_year_id, term, start_date, end_date, status, created_at, updated_at'
    )
    .single()

  if (error) throw error
  return data as Semester
}

export async function closeSemester(id: string, tenantId: string): Promise<Semester> {
  const { data, error } = await db
    .from('semesters')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(
      'id, tenant_id, name, academic_year_id, term, start_date, end_date, status, created_at, updated_at'
    )
    .single()

  if (error) throw error
  return data as Semester
}

export async function cloneCourseToSemester(
  courseId: string,
  targetSemesterId: string,
  tenantId: string
): Promise<string> {
  const { data, error } = await db.rpc('clone_course_to_semester', {
    p_course_id: courseId,
    p_target_semester_id: targetSemesterId,
    p_tenant_id: tenantId,
  })

  if (error) throw error
  return data as string
}

export async function promoteStudentsToNextClass(
  studentIds: string[],
  newClass: string,
  tenantId: string
): Promise<number> {
  const { data, error } = await db.rpc('promote_students_to_next_class', {
    p_tenant_id: tenantId,
    p_student_ids: studentIds,
    p_new_class: newClass,
  })

  if (error) throw error
  return data as number
}

export async function generateSemesterReportCard(
  semesterId: string,
  studentId: string,
  tenantId: string
): Promise<ReportCardData> {
  const { data, error } = await db.rpc('generate_semester_report_card', {
    p_semester_id: semesterId,
    p_student_id: studentId,
    p_tenant_id: tenantId,
  })

  if (error) throw error
  return data as ReportCardData
}
