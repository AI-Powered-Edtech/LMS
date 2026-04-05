import { supabase } from '@/services/supabase/client'

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
  status: 'completed' | 'failed' | 'partial'
  errors: RowError[]
}

export async function createImportJob(tenantId: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User tidak ditemukan')

  const { data, error } = await supabase
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
  const { data, error } = await supabase.functions.invoke('bulk-import-users', {
    body: { rows, tenantId, importJobId },
  })

  if (error) throw error
  return data as BulkImportResult
}
