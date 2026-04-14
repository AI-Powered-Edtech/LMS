import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'

import { fetchFinanceMonthly, fetchFinanceOverview, fetchFinancePage } from '../api/financeApi'
import type { FinanceDataResult, InvoiceFilter } from '../types/finance'

export function useFinanceData(filter: InvoiceFilter): FinanceDataResult {
  const { tenantId } = useAuth()

  const invoicesQuery = useQuery({
    queryKey: ['finance', tenantId ?? '', 'invoices', filter],
    queryFn: () => fetchFinancePage(tenantId!, filter),
    enabled: !!tenantId,
    placeholderData: (prev) => prev,
  })

  const overviewQuery = useQuery({
    queryKey: ['finance', tenantId ?? '', 'overview'],
    queryFn: () => fetchFinanceOverview(tenantId!),
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  })

  const monthlyQuery = useQuery({
    queryKey: ['finance', tenantId ?? '', 'monthly'],
    queryFn: () => fetchFinanceMonthly(tenantId!),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
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
