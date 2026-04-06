/**
 * Finance Reconciliation Service
 * 
 * Provides methods for transaction locking, reconciliation workflow,
 * and audit trail queries.
 */

import { supabase } from '@/services/supabase/client'

/**
 * Service for finance reconciliation API calls
 */
export const financeReconciliationService = {
  /**
   * Lock a transaction for editing
   */
  async lockTransaction(transactionId: string, userId: string) {
    const { data, error } = await supabase.rpc('lock_finance_transaction', {
      p_transaction_id: transactionId,
      p_user_id: userId,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    return row as {
      success: boolean
      message: string
      locked_by: string | null
      locked_at: string | null
    }
  },

  /**
   * Release a transaction lock
   */
  async unlockTransaction(transactionId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('unlock_finance_transaction', {
      p_transaction_id: transactionId,
      p_user_id: userId,
    })

    if (error) throw error
    return data as boolean
  },

  /**
   * Reconcile a transaction
   */
  async reconcileTransaction(
    transactionId: string,
    userId: string,
    notes?: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('reconcile_finance_transaction', {
      p_transaction_id: transactionId,
      p_user_id: userId,
      p_notes: notes ?? null,
    })

    if (error) throw error
    return data as boolean
  },

  /**
   * Dispute a transaction
   */
  async disputeTransaction(
    transactionId: string,
    userId: string,
    reason: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('dispute_finance_transaction', {
      p_transaction_id: transactionId,
      p_user_id: userId,
      p_reason: reason,
    })

    if (error) throw error
    return data as boolean
  },

  /**
   * Get audit log for a transaction
   */
  async getTransactionAuditLog(transactionId: string) {
    const { data, error } = await supabase
      .from('finance_audit_log')
      .select(`
        *,
        performed_by:profiles(full_name, avatar_url)
      `)
      .eq('transaction_id', transactionId)
      .order('performed_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  /**
   * Get reconciliation stats from materialized view
   */
  async getReconciliationStats(tenantId: string, days: number = 30) {
    const { data, error } = await supabase
      .from('mv_finance_reconciliation_stats')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('transaction_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('transaction_date', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  /**
   * Get pending reconciliation items
   */
  async getPendingReconciliation(tenantId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select(`
        *,
        locked_by:profiles(full_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('reconciliation_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data ?? []
  },

  /**
   * Get disputed transactions
   */
  async getDisputedTransactions(tenantId: string) {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select(`
        *,
        reconciled_by:profiles(full_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('reconciliation_status', 'disputed')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },
}
