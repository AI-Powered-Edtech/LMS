// EduSync LMS — Finance Audit Trail Utility
// Provides functions for recording and querying finance audit events

import { db } from '@/services/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'payment_recorded'
  | 'payment_reversed'
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_voided'
  | 'reconciliation_matched'
  | 'reconciliation_unmatched'

export interface AuditEntry {
  id: string
  tenantId: string
  invoiceId: string | null
  paymentId: string | null
  studentId: string | null
  action: AuditAction
  previousStatus: string | null
  newStatus: string | null
  previousAmount: number | null
  newAmount: number | null
  performedBy: string
  performedAt: string
  notes: string | null
  reconciliationBatchId: string | null
}

export interface AuditFilter {
  invoiceId?: string
  action?: AuditAction
  performedBy?: string
  fromDate?: string
  toDate?: string
  limit?: number
}

// ---------------------------------------------------------------------------
// Audit Recording (client-side fallback if RPC audit insert fails)
// ---------------------------------------------------------------------------

/**
 * Record a finance audit event.
 * This is typically handled by the database RPC functions, but this utility
 * provides a client-side fallback for events not covered by RPCs.
 */
export async function recordAuditEvent(params: {
  invoiceId?: string
  action: AuditAction
  previousStatus?: string
  newStatus?: string
  previousAmount?: number
  newAmount?: number
  notes?: string
}): Promise<string | null> {
  try {
    const { data, error } = await db
      .from('finance_payment_audit')
      .insert({
        invoice_id: params.invoiceId ?? null,
        action: params.action,
        previous_status: params.previousStatus ?? null,
        new_status: params.newStatus ?? null,
        previous_amount: params.previousAmount ?? null,
        new_amount: params.newAmount ?? null,
        notes: params.notes ?? null,
      })
      .select('id')
      .single()

    if (error) {
      if (import.meta.env.DEV) console.error('[FinanceAudit] recordAuditEvent error:', error)
      return null
    }

    return data?.id ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Audit Querying
// ---------------------------------------------------------------------------

/**
 * Query audit entries with optional filters.
 */
export async function queryAuditTrail(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  let query = db
    .from('finance_payment_audit')
    .select('*')
    .order('performed_at', { ascending: false })

  if (filter.invoiceId) {
    query = query.eq('invoice_id', filter.invoiceId)
  }

  if (filter.action) {
    query = query.eq('action', filter.action)
  }

  if (filter.performedBy) {
    query = query.eq('performed_by', filter.performedBy)
  }

  if (filter.fromDate) {
    query = query.gte('performed_at', filter.fromDate)
  }

  if (filter.toDate) {
    query = query.lte('performed_at', filter.toDate)
  }

  if (filter.limit) {
    query = query.limit(filter.limit)
  }

  const { data, error } = await query

  if (error) {
    if (import.meta.env.DEV) console.error('[FinanceAudit] queryAuditTrail error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    invoiceId: row.invoice_id,
    paymentId: row.payment_id,
    studentId: row.student_id,
    action: row.action,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    previousAmount: row.previous_amount ? parseFloat(row.previous_amount) : null,
    newAmount: row.new_amount ? parseFloat(row.new_amount) : null,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
    notes: row.notes,
    reconciliationBatchId: row.reconciliation_batch_id,
  }))
}

/**
 * Get audit summary for an invoice.
 */
export async function getInvoiceAuditSummary(invoiceId: string): Promise<{
  totalEvents: number
  firstEventAt: string | null
  lastEventAt: string | null
  paymentCount: number
  reversalCount: number
}> {
  const entries = await queryAuditTrail({ invoiceId, limit: 1000 })

  return {
    totalEvents: entries.length,
    firstEventAt: entries.length > 0 ? entries[entries.length - 1].performedAt : null,
    lastEventAt: entries.length > 0 ? entries[0].performedAt : null,
    paymentCount: entries.filter((e) => e.action === 'payment_recorded').length,
    reversalCount: entries.filter((e) => e.action === 'payment_reversed').length,
  }
}

/**
 * Export audit trail to CSV format.
 */
export function exportAuditToCSV(entries: AuditEntry[], filename?: string): void {
  const rows: string[][] = []

  // Header
  rows.push([
    'Timestamp',
    'Action',
    'Invoice ID',
    'Previous Status',
    'New Status',
    'Previous Amount',
    'New Amount',
    'Performed By',
    'Notes',
  ])

  // Data
  entries.forEach((e) => {
    rows.push([
      e.performedAt,
      e.action,
      e.invoiceId ?? '',
      e.previousStatus ?? '',
      e.newStatus ?? '',
      e.previousAmount?.toString() ?? '',
      e.newAmount?.toString() ?? '',
      e.performedBy,
      e.notes ?? '',
    ])
  })

  // Generate CSV
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // Trigger download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `finance_audit_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
