/**
 * useFinanceData.ts — Hook untuk mengambil data keuangan dari Supabase.
 *
 * Queries:
 *  1. finance_invoice_details view  → daftar invoice per siswa
 *  2. get_finance_overview RPC       → statistik bulan ini
 *  3. get_finance_monthly RPC        → data 6 bulan untuk chart
 */

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/services/supabase/client'

import type {
  FinanceDataResult,
  FinanceOverview,
  InvoiceFilter,
  InvoiceRecord,
  MonthlyData,
} from '../types/finance'

// ---------------------------------------------------------------------------
// Helper: ambil tenant_id dari profil user saat ini
// ---------------------------------------------------------------------------

async function getMyTenantId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()

  return data?.tenant_id ?? null
}

// ---------------------------------------------------------------------------
// Query: daftar invoice dengan filter
// ---------------------------------------------------------------------------

async function fetchInvoices(
  filter: InvoiceFilter
): Promise<{ data: InvoiceRecord[]; count: number }> {
  const tenantId = await getMyTenantId()
  if (!tenantId) return { data: [], count: 0 }

  const from = (filter.page - 1) * filter.pageSize
  const to = from + filter.pageSize - 1

  let query = supabase
    .from('finance_invoice_details')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  // Filter status
  if (filter.status === 'paid') {
    query = query.in('status', ['paid', 'lunas'])
  } else if (filter.status === 'pending') {
    query = query.in('status', ['pending', 'open', 'draft'])
  } else if (filter.status === 'overdue') {
    query = query.in('status', ['overdue', 'terlambat', 'uncollectible'])
  }

  // Search nama siswa
  if (filter.search.trim()) {
    query = query.ilike('student_name', `%${filter.search.trim()}%`)
  }

  const { data, error, count } = await query

  if (error) {
    if (import.meta.env.DEV) console.warn('fetchInvoices error:', error.message)
    // Fallback: query langsung dari invoices jika view belum ada
    return fetchInvoicesFallback(tenantId, filter)
  }

  return { data: (data ?? []) as InvoiceRecord[], count: count ?? 0 }
}

// Fallback jika view finance_invoice_details belum tersedia
async function fetchInvoicesFallback(
  tenantId: string,
  filter: InvoiceFilter
): Promise<{ data: InvoiceRecord[]; count: number }> {
  const from = (filter.page - 1) * filter.pageSize
  const to = from + filter.pageSize - 1

  let query = supabase
    .from('invoices')
    // Note: description column may not exist in all schema versions, excluded from select
    .select(
      'id, tenant_id, student_id, amount, amount_due, amount_paid, status, month_year, due_date, paid_at, created_at, updated_at',
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filter.status === 'paid') {
    query = query.in('status', ['paid', 'PAID', 'lunas'])
  } else if (filter.status === 'pending') {
    query = query.in('status', ['pending', 'PENDING', 'open', 'draft'])
  } else if (filter.status === 'overdue') {
    query = query.in('status', ['overdue', 'OVERDUE'])
  }

  const { data, error, count } = await query

  if (error) {
    // invoices table may not exist or schema mismatch — return empty gracefully
    if (import.meta.env.DEV) console.warn('fetchInvoicesFallback error:', error.message)
    return { data: [], count: 0 }
  }

  const mapped: InvoiceRecord[] = (data ?? []).map((inv) => ({
    id: inv.id,
    tenant_id: inv.tenant_id,
    student_id: inv.student_id ?? null,
    student_name: null,
    student_email: null,
    amount_due: inv.amount_due ?? inv.amount ?? 0,
    amount_paid: inv.amount_paid ?? 0,
    status: (inv.status ?? 'pending').toLowerCase(),
    description: null, // description column not in all schema versions
    month_year: inv.month_year ?? null,
    due_date: inv.due_date ?? null,
    paid_at: inv.paid_at ?? null,
    created_at: inv.created_at,
    updated_at: inv.updated_at,
  }))

  return { data: mapped, count: count ?? 0 }
}

// ---------------------------------------------------------------------------
// Query: overview stats via RPC
// ---------------------------------------------------------------------------

async function fetchFinanceOverview(): Promise<FinanceOverview> {
  const tenantId = await getMyTenantId()
  if (!tenantId) {
    return { total_this_month: 0, paid_this_month: 0, unpaid_total: 0, payment_rate: 0 }
  }

  const { data, error } = await supabase.rpc('get_finance_overview', {
    p_tenant_id: tenantId,
  })

  if (error) {
    if (import.meta.env.DEV) console.warn('get_finance_overview error:', error.message)
    // Compute manually if RPC not available
    return computeOverviewFallback(tenantId)
  }

  return data as FinanceOverview
}

async function computeOverviewFallback(tenantId: string): Promise<FinanceOverview> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const [{ data: allThisMonth }, { data: unpaidAll }] = await Promise.all([
    supabase
      .from('invoices')
      .select('amount_due, amount, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd),
    supabase
      .from('invoices')
      .select('amount_due, amount')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'PENDING', 'open', 'overdue', 'OVERDUE']),
  ])

  const total = (allThisMonth ?? []).reduce((s, r) => s + (r.amount_due ?? r.amount ?? 0), 0)
  const paid = (allThisMonth ?? [])
    .filter((r) => ['paid', 'PAID', 'lunas'].includes(r.status?.toLowerCase() ?? ''))
    .reduce((s, r) => s + (r.amount_due ?? r.amount ?? 0), 0)
  const unpaid = (unpaidAll ?? []).reduce((s, r) => s + (r.amount_due ?? r.amount ?? 0), 0)

  return {
    total_this_month: total,
    paid_this_month: paid,
    unpaid_total: unpaid,
    payment_rate: total > 0 ? Math.round((paid / total) * 1000) / 10 : 0,
  }
}

// ---------------------------------------------------------------------------
// Query: monthly chart data via RPC
// ---------------------------------------------------------------------------

async function fetchMonthlyData(): Promise<MonthlyData[]> {
  const tenantId = await getMyTenantId()
  if (!tenantId) return []

  const { data, error } = await supabase.rpc('get_finance_monthly', {
    p_tenant_id: tenantId,
  })

  if (error) {
    if (import.meta.env.DEV) console.warn('get_finance_monthly error:', error.message)
    return computeMonthlyFallback(tenantId)
  }

  return (data ?? []) as MonthlyData[]
}

async function computeMonthlyFallback(tenantId: string): Promise<MonthlyData[]> {
  const months: MonthlyData[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

    const { data } = await supabase
      .from('invoices')
      .select('amount_due, amount, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    const total = (data ?? []).reduce((s, r) => s + (r.amount_due ?? r.amount ?? 0), 0)
    const paid = (data ?? [])
      .filter((r) => ['paid', 'PAID', 'lunas'].includes(r.status?.toLowerCase() ?? ''))
      .reduce((s, r) => s + (r.amount_due ?? r.amount ?? 0), 0)

    const ID_MONTHS = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ]
    const yy = String(start.getFullYear()).slice(2)

    months.push({
      month_label: `${ID_MONTHS[start.getMonth()]} ${yy}`,
      month_key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      total,
      paid,
    })
  }

  return months
}

// ---------------------------------------------------------------------------
// Hook utama
// ---------------------------------------------------------------------------

export function useFinanceData(filter: InvoiceFilter): FinanceDataResult {
  const invoicesQuery = useQuery({
    queryKey: ['finance', 'invoices', filter],
    queryFn: () => fetchInvoices(filter),
    placeholderData: (prev) => prev,
  })

  const overviewQuery = useQuery({
    queryKey: ['finance', 'overview'],
    queryFn: fetchFinanceOverview,
    staleTime: 2 * 60 * 1000, // 2 menit
  })

  const monthlyQuery = useQuery({
    queryKey: ['finance', 'monthly'],
    queryFn: fetchMonthlyData,
    staleTime: 5 * 60 * 1000, // 5 menit
  })

  const error =
    (invoicesQuery.error as Error | null) ??
    (overviewQuery.error as Error | null) ??
    (monthlyQuery.error as Error | null)

  return {
    overviewStats: overviewQuery.data ?? null,
    invoices: invoicesQuery.data?.data ?? [],
    totalCount: invoicesQuery.data?.count ?? 0,
    monthlyData: monthlyQuery.data ?? [],
    isLoading: invoicesQuery.isLoading,
    isOverviewLoading: overviewQuery.isLoading,
    isMonthlyLoading: monthlyQuery.isLoading,
    error,
  }
}
