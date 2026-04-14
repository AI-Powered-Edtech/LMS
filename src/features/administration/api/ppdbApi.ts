/**
 * ppdbApi.ts — Service layer untuk modul PPDB Online.
 *
 * Semua query menggunakan Supabase client dengan RLS.
 * Tenant isolation dilakukan via RLS policy + auto_set_tenant_id trigger.
 */
import { db } from '@/services/db'
import { logger } from '@/utils/logger'

import type {
  PPDBPeriod,
  PPDBPeriodInput,
  PPDBPeriodStatus,
  PPDBRegistration,
  PPDBRegistrationFilter,
  PPDBRegistrationStatus,
  PPDBSummary,
} from '../types/ppdb'

// ---------------------------------------------------------------------------
// Helper: ambil tenant_id dari profil user saat ini
// ---------------------------------------------------------------------------

async function getMyTenantId(): Promise<string | null> {
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null

  const { data } = await db.from('profiles').select('tenant_id').eq('id', user.id).single()

  return data?.tenant_id ?? null
}

// ---------------------------------------------------------------------------
// Periode PPDB
// ---------------------------------------------------------------------------

/** Ambil semua periode PPDB tenant */
export async function fetchPPDBPeriods(): Promise<PPDBPeriod[]> {
  const { data, error } = await db
    .from('ppdb_periods')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) logger.warn('fetchPPDBPeriods error:', error.message)
    return []
  }

  return (data ?? []) as PPDBPeriod[]
}

/** Buat periode baru */
export async function createPPDBPeriod(input: PPDBPeriodInput): Promise<PPDBPeriod | null> {
  const tenantId = await getMyTenantId()
  if (!tenantId) throw new Error('Tidak dapat menentukan tenant')

  const { data, error } = await db
    .from('ppdb_periods')
    .insert({
      tenant_id: tenantId,
      academic_year: input.academic_year,
      name: input.name,
      start_date: input.start_date,
      end_date: input.end_date,
      quota: input.quota,
      status: 'draft' as PPDBPeriodStatus,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as PPDBPeriod
}

/** Update status periode */
export async function updatePeriodStatus(
  periodId: string,
  status: PPDBPeriodStatus
): Promise<void> {
  const { error } = await db.from('ppdb_periods').update({ status }).eq('id', periodId)

  if (error) throw new Error(error.message)
}

/** Update periode */
export async function updatePPDBPeriod(
  periodId: string,
  input: Partial<PPDBPeriodInput>
): Promise<void> {
  const { error } = await db.from('ppdb_periods').update(input).eq('id', periodId)

  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Pendaftar (Registrations)
// ---------------------------------------------------------------------------

/** Ambil daftar pendaftar dengan filter, pagination */
export async function fetchRegistrations(
  periodId: string,
  filter: PPDBRegistrationFilter
): Promise<{ data: PPDBRegistration[]; count: number }> {
  const from = (filter.page - 1) * filter.pageSize
  const to = from + filter.pageSize - 1

  let query = db
    .from('ppdb_registrations')
    .select('*', { count: 'exact' })
    .eq('period_id', periodId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filter.status !== 'all') {
    query = query.eq('status', filter.status)
  }

  if (filter.search.trim()) {
    query = query.or(
      `student_name.ilike.%${filter.search.trim()}%,registration_number.ilike.%${filter.search.trim()}%,parent_name.ilike.%${filter.search.trim()}%`
    )
  }

  const { data, error, count } = await query

  if (error) {
    if (import.meta.env.DEV) logger.warn('fetchRegistrations error:', error.message)
    return { data: [], count: 0 }
  }

  return { data: (data ?? []) as PPDBRegistration[], count: count ?? 0 }
}

/** Ambil ringkasan statistik pendaftar */
export async function fetchPPDBSummary(periodId: string): Promise<PPDBSummary> {
  const { data: period } = await db.from('ppdb_periods').select('quota').eq('id', periodId).single()

  const { data, error } = await db
    .from('ppdb_registrations')
    .select('status')
    .eq('period_id', periodId)

  if (error) {
    if (import.meta.env.DEV) logger.warn('fetchPPDBSummary error:', error.message)
    return {
      total: 0,
      quota: period?.quota ?? 0,
      accepted: 0,
      rejected: 0,
      pending: 0,
      reviewed: 0,
      waitlisted: 0,
    }
  }

  const regs = data ?? []
  return {
    total: regs.length,
    quota: period?.quota ?? 0,
    accepted: regs.filter((r: any) => r.status === 'accepted').length,
    rejected: regs.filter((r: any) => r.status === 'rejected').length,
    pending: regs.filter((r: any) => r.status === 'pending').length,
    reviewed: regs.filter((r: any) => r.status === 'reviewed').length,
    waitlisted: regs.filter((r: any) => r.status === 'waitlisted').length,
  }
}

/** Update status satu pendaftar */
export async function updateRegistrationStatus(
  registrationId: string,
  status: PPDBRegistrationStatus,
  notes?: string
): Promise<void> {
  const {
    data: { user },
  } = await db.auth.getUser()

  const updatePayload: Record<string, unknown> = {
    status,
    reviewed_by: user?.id ?? null,
    reviewed_at: new Date().toISOString(),
  }
  if (notes !== undefined) {
    updatePayload.notes = notes
  }

  const { error } = await db
    .from('ppdb_registrations')
    .update(updatePayload)
    .eq('id', registrationId)

  if (error) throw new Error(error.message)
}

/** Bulk update status beberapa pendaftar */
export async function bulkUpdateRegistrationStatus(
  registrationIds: string[],
  status: PPDBRegistrationStatus
): Promise<void> {
  const {
    data: { user },
  } = await db.auth.getUser()

  const { error } = await db
    .from('ppdb_registrations')
    .update({
      status,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', registrationIds)

  if (error) throw new Error(error.message)
}

/** Buat pendaftar baru (admin manual entry) */
export async function createRegistration(
  periodId: string,
  input: {
    student_name: string
    birth_date: string
    gender: 'L' | 'P'
    previous_school?: string
    parent_name: string
    parent_phone: string
    parent_email?: string
    address?: string
  }
): Promise<PPDBRegistration | null> {
  const tenantId = await getMyTenantId()
  if (!tenantId) throw new Error('Tidak dapat menentukan tenant')

  // Generate registration number
  const { count } = await db
    .from('ppdb_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('period_id', periodId)

  const year = new Date().getFullYear()
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  const registrationNumber = `PPDB-${year}-${seq}`

  const { data, error } = await db
    .from('ppdb_registrations')
    .insert({
      tenant_id: tenantId,
      period_id: periodId,
      registration_number: registrationNumber,
      student_name: input.student_name,
      birth_date: input.birth_date,
      gender: input.gender,
      previous_school: input.previous_school ?? null,
      parent_name: input.parent_name,
      parent_phone: input.parent_phone,
      parent_email: input.parent_email ?? null,
      address: input.address ?? null,
      documents: {},
      status: 'pending' as PPDBRegistrationStatus,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as PPDBRegistration
}
