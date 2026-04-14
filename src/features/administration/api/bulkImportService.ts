import { readVilSession } from '@/services/auth/vilSession'
import { db } from '@/services/db'

export interface BulkImportRow {
  email: string
  full_name: string
  role: string
  nis?: string
  nomor_hp?: string
}

export interface RowError {
  row: number
  email: string
  reason: string
}

interface BulkImportResult {
  success: number
  failed: number
  total: number
  status: 'completed' | 'failed' | 'partial' | 'processing'
  errors: RowError[]
}

export interface BulkImportJobStatus {
  id: string
  status: 'processing' | 'completed' | 'failed' | 'partial'
  total_rows: number
  success_rows: number
  failed_rows: number
}

export interface BulkImportJobRow {
  row_number: number
  email: string
  full_name: string
  role: string
  nis?: string | null
  nomor_hp?: string | null
  status: 'pending' | 'processing' | 'success' | 'failed'
  error_reason?: string | null
}

export async function createImportJob(tenantId: string): Promise<string> {
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) throw new Error('User tidak ditemukan')

  const { data, error } = await db
    .from('bulk_import_jobs')
    .insert({
      tenant_id: tenantId,
      created_by: user.id,
      status: 'processing',
      total_rows: 0,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function runBulkImport(
  rows: BulkImportRow[],
  tenantId: string,
  importJobId: string
): Promise<BulkImportResult> {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
  const token = readVilSession()?.access_token

  const response = await fetch(`${apiUrl}/api/v1/import/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ rows, tenantId, importJobId }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Gagal mengimpor pengguna.' }))
    throw new Error(err.message ?? 'Gagal mengimpor pengguna.')
  }

  return response.json() as Promise<BulkImportResult>
}

export async function getImportJobStatus(importJobId: string): Promise<BulkImportJobStatus> {
  const { data, error } = await db
    .from('bulk_import_jobs')
    .select('id, status, total_rows, success_rows, failed_rows')
    .eq('id', importJobId)
    .single()

  if (error) throw error
  return data as BulkImportJobStatus
}

export async function getImportJobRows(importJobId: string): Promise<BulkImportJobRow[]> {
  const { data, error } = await db
    .from('bulk_import_job_rows')
    .select('row_number, email, full_name, role, nis, nomor_hp, status, error_reason')
    .eq('job_id', importJobId)
    .order('row_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as BulkImportJobRow[]
}
