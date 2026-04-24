import { db } from '@/services/db'
import type { AcademicYear, AcademicYearFormData } from '../types'

export async function fetchAcademicYears(tenantId: string): Promise<AcademicYear[]> {
  const { data, error } = await db
    .from('academic_years')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as AcademicYear[]
}

export async function createAcademicYear(formData: AcademicYearFormData, tenantId: string): Promise<AcademicYear> {
  const { data, error } = await db
    .from('academic_years')
    .insert({ ...formData, tenant_id: tenantId })
    .select('*')
    .single()

  if (error) throw error
  return data as AcademicYear
}

export async function updateAcademicYear(id: string, updates: Partial<AcademicYearFormData>, tenantId: string): Promise<AcademicYear> {
  const { data, error } = await db
    .from('academic_years')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error) throw error
  return data as AcademicYear
}

export async function deleteAcademicYear(id: string, tenantId: string): Promise<void> {
  const { error } = await db
    .from('academic_years')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw error
}
