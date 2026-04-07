import { supabase } from '@/services/supabase/client'

import type { FinanceOverview, InvoiceFilter, InvoiceRecord, MonthlyData } from '../types/finance'

interface FinancePageResult {
  data: InvoiceRecord[]
  count: number
}

export interface ReminderResult {
  invoiceId: string
  studentId: string | null
  studentName: string | null
  studentEmail: string | null
  reminderStatus: string
  reminderMessage: string
}

export interface ReconcilePaymentInput {
  invoiceId: string
  amount: number
  method: string
  reference?: string
  notes?: string
}

export interface ReconcilePaymentResult {
  paymentId: string
  invoiceId: string
  invoiceStatus: string
  amountPaid: number
  amountRemaining: number
  paidAt: string | null
}

function normaliseInvoice(row: Record<string, unknown>): InvoiceRecord {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    student_id: (row.student_id as string | null) ?? null,
    student_name: (row.student_name as string | null) ?? null,
    student_email: (row.student_email as string | null) ?? null,
    amount_due: Number(row.amount_due ?? 0),
    amount_paid: Number(row.amount_paid ?? 0),
    status: String(row.status ?? 'pending'),
    description: (row.description as string | null) ?? null,
    month_year: (row.month_year as string | null) ?? null,
    due_date: (row.due_date as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function fetchFinancePage(
  tenantId: string,
  filter: InvoiceFilter
): Promise<FinancePageResult> {
  const { data, error } = await supabase.rpc('get_finance_dashboard_page', {
    p_tenant_id: tenantId,
    p_status: filter.status,
    p_search: filter.search.trim(),
    p_page: filter.page,
    p_page_size: filter.pageSize,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Finance] get_finance_dashboard_page error:', error)
    throw new Error('Gagal memuat daftar tagihan.')
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map(normaliseInvoice)
  const count =
    rows.length > 0 ? Number((data?.[0] as Record<string, unknown>).total_count ?? 0) : 0

  return { data: rows, count }
}

export async function fetchFinanceOverview(tenantId: string): Promise<FinanceOverview> {
  const { data, error } = await supabase.rpc('get_finance_overview', {
    p_tenant_id: tenantId,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Finance] get_finance_overview error:', error)
    throw new Error('Gagal memuat ringkasan keuangan.')
  }

  return (data ?? {
    total_this_month: 0,
    paid_this_month: 0,
    unpaid_total: 0,
    payment_rate: 0,
  }) as FinanceOverview
}

export async function fetchFinanceMonthly(tenantId: string): Promise<MonthlyData[]> {
  const { data, error } = await supabase.rpc('get_finance_monthly', {
    p_tenant_id: tenantId,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Finance] get_finance_monthly error:', error)
    throw new Error('Gagal memuat tren pembayaran.')
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    month_label: String(row.month_label ?? ''),
    month_key: String(row.month_key ?? ''),
    total: Number(row.total ?? 0),
    paid: Number(row.paid ?? 0),
  }))
}

export async function reconcileInvoicePayment(
  input: ReconcilePaymentInput
): Promise<ReconcilePaymentResult> {
  const { data, error } = await supabase.rpc('reconcile_invoice_payment', {
    p_invoice_id: input.invoiceId,
    p_amount: input.amount,
    p_method: input.method,
    p_reference: input.reference?.trim() || null,
    p_notes: input.notes?.trim() || null,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Finance] reconcile_invoice_payment error:', error)
    throw new Error(error.message || 'Gagal merekonsiliasi pembayaran.')
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('Hasil rekonsiliasi pembayaran tidak valid.')
  }

  return {
    paymentId: String(row.payment_id),
    invoiceId: String(row.invoice_id),
    invoiceStatus: String(row.invoice_status),
    amountPaid: Number(row.amount_paid ?? 0),
    amountRemaining: Number(row.amount_remaining ?? 0),
    paidAt: (row.paid_at as string | null) ?? null,
  }
}

export async function sendInvoiceReminders(
  tenantId: string,
  invoiceIds?: string[]
): Promise<ReminderResult[]> {
  const { data, error } = await supabase.rpc('send_invoice_reminders', {
    p_tenant_id: tenantId,
    p_invoice_ids: invoiceIds && invoiceIds.length > 0 ? invoiceIds : null,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[Finance] send_invoice_reminders error:', error)
    throw new Error(error.message || 'Gagal mengirim pengingat tagihan.')
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    invoiceId: String(row.invoice_id),
    studentId: (row.student_id as string | null) ?? null,
    studentName: (row.student_name as string | null) ?? null,
    studentEmail: (row.student_email as string | null) ?? null,
    reminderStatus: String(row.reminder_status ?? 'unknown'),
    reminderMessage: String(row.reminder_message ?? ''),
  }))
}
