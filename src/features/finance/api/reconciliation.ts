// EduSync LMS — Finance Reconciliation Service
// Handles payment recording with locking, batch reconciliation, and audit trail

import { db } from '@/services/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentResult {
  success: boolean
  message: string
  newStatus: string | null
}

export interface ReconciliationResult {
  batchId: string
  matchedCount: number
  unmatchedCount: number
  totalAmount: number
}

export interface FinanceSummary {
  totalInvoices: number
  totalAmount: number
  totalPaid: number
  totalUnpaid: number
  paymentRate: number
  overdueCount: number
  thisMonthCollected: number
}

export interface PaymentAuditEntry {
  id: string
  invoiceId: string | null
  action: string
  previousStatus: string | null
  newStatus: string | null
  previousAmount: number | null
  newAmount: number | null
  performedBy: string
  performedAt: string
  notes: string | null
}

export interface ReconciliationBatch {
  id: string
  batchNumber: number
  status: 'in_progress' | 'completed' | 'cancelled'
  totalInvoices: number
  matchedInvoices: number
  unmatchedInvoices: number
  totalAmount: number
  matchedAmount: number
  createdBy: string
  createdAt: string
  completedAt: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const financeReconciliationService = {
  /**
   * Record a payment with row-level locking to prevent double-payment.
   * Uses advisory lock pattern via FOR UPDATE SKIP LOCKED.
   */
  async recordPayment(
    invoiceId: string,
    amount: number,
    method: string = 'transfer',
    notes?: string
  ): Promise<PaymentResult> {
    const { data, error } = await db.rpc('record_payment_with_lock', {
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_method: method,
      p_notes: notes ?? null,
    })

    if (error) {
      if (import.meta.env.DEV) console.error('[Finance] recordPayment error:', error)
      throw new Error('Gagal mencatat pembayaran.')
    }

    const row = Array.isArray(data) ? data[0] : data
    return {
      success: row?.success ?? false,
      message: row?.message ?? 'Unknown error',
      newStatus: row?.new_status ?? null,
    }
  },

  /**
   * Batch reconcile multiple invoices.
   * Creates a reconciliation batch and audits each invoice.
   */
  async reconcileInvoices(invoiceIds: string[], notes?: string): Promise<ReconciliationResult> {
    const { data, error } = await db.rpc('reconcile_invoices', {
      p_invoice_ids: invoiceIds,
      p_batch_notes: notes ?? null,
    })

    if (error) {
      if (import.meta.env.DEV) console.error('[Finance] reconcileInvoices error:', error)
      throw new Error('Gagal melakukan rekonsiliasi.')
    }

    const row = Array.isArray(data) ? data[0] : data
    return {
      batchId: row?.batch_id ?? '',
      matchedCount: parseInt(row?.matched_count) || 0,
      unmatchedCount: parseInt(row?.unmatched_count) || 0,
      totalAmount: parseFloat(row?.total_amount) || 0,
    }
  },

  /**
   * Get finance dashboard summary metrics.
   */
  async getSummary(): Promise<FinanceSummary> {
    const { data, error } = await db.rpc('get_finance_summary')

    if (error) {
      if (import.meta.env.DEV) console.error('[Finance] getSummary error:', error)
      throw new Error('Gagal memuat ringkasan keuangan.')
    }

    const row = Array.isArray(data) ? data[0] : data
    return {
      totalInvoices: parseInt(row?.total_invoices) || 0,
      totalAmount: parseFloat(row?.total_amount) || 0,
      totalPaid: parseFloat(row?.total_paid) || 0,
      totalUnpaid: parseFloat(row?.total_unpaid) || 0,
      paymentRate: parseFloat(row?.payment_rate) || 0,
      overdueCount: parseInt(row?.overdue_count) || 0,
      thisMonthCollected: parseFloat(row?.this_month_collected) || 0,
    }
  },

  /**
   * Get payment audit trail for an invoice.
   */
  async getPaymentAudit(invoiceId: string): Promise<PaymentAuditEntry[]> {
    const { data, error } = await db
      .from('finance_payment_audit')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('performed_at', { ascending: false })

    if (error) {
      if (import.meta.env.DEV) console.error('[Finance] getPaymentAudit error:', error)
      return []
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      action: row.action,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      previousAmount: row.previous_amount ? parseFloat(row.previous_amount) : null,
      newAmount: row.new_amount ? parseFloat(row.new_amount) : null,
      performedBy: row.performed_by,
      performedAt: row.performed_at,
      notes: row.notes,
    }))
  },

  /**
   * Get reconciliation batches.
   */
  async getReconciliationBatches(limit: number = 20): Promise<ReconciliationBatch[]> {
    const { data, error } = await db
      .from('finance_reconciliation_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (import.meta.env.DEV) console.error('[Finance] getReconciliationBatches error:', error)
      return []
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      batchNumber: row.batch_number,
      status: row.status,
      totalInvoices: row.total_invoices,
      matchedInvoices: row.matched_invoices,
      unmatchedInvoices: row.unmatched_invoices,
      totalAmount: parseFloat(row.total_amount) || 0,
      matchedAmount: parseFloat(row.matched_amount) || 0,
      createdBy: row.created_by,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      notes: row.notes,
    }))
  },
}
