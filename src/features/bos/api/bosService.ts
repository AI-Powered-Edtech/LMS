import { db } from '@/services/db'

export interface BosFundingPeriod {
  id: string
  tenant_id: string
  period_label: string
  period_quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
  funding_year: number
  allocated_amount: number
  received_amount: number
  received_at: string | null
  status: 'allocated' | 'received' | 'spent' | 'reported'
  created_at: string
}

export interface BosExpenseCategory {
  id: string
  code: string
  label: string
  description: string | null
}

export interface BosExpense {
  id: string
  tenant_id: string
  funding_period_id: string | null
  category_id: string | null
  description: string
  amount: number
  expense_date: string
  receipt_url: string | null
  vendor_name: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export const bosService = {
  async listPeriods(tenantId: string): Promise<BosFundingPeriod[]> {
    const { data, error } = await db
      .from<Array<BosFundingPeriod>>('bos_funding_periods')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('funding_year', { ascending: false })
      .order('period_quarter', { ascending: false })
    if (error) throw error
    return (data ?? []) as BosFundingPeriod[]
  },

  async listCategories(): Promise<BosExpenseCategory[]> {
    const { data, error } = await db
      .from<Array<BosExpenseCategory>>('bos_expense_categories')
      .select('id, code, label, description')
      .order('code', { ascending: true })
    if (error) throw error
    return (data ?? []) as BosExpenseCategory[]
  },

  async listExpenses(tenantId: string): Promise<BosExpense[]> {
    const { data, error } = await db
      .from<Array<BosExpense>>('bos_expenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('expense_date', { ascending: false })
      .limit(200)
    if (error) throw error
    return (data ?? []) as BosExpense[]
  },

  async createExpense(input: {
    tenantId: string
    fundingPeriodId: string | null
    categoryId: string | null
    description: string
    amount: number
    expenseDate: string
    vendorName?: string
  }): Promise<BosExpense> {
    const { data, error } = await db
      .from<Array<BosExpense>>('bos_expenses')
      .insert({
        tenant_id: input.tenantId,
        funding_period_id: input.fundingPeriodId,
        category_id: input.categoryId,
        description: input.description,
        amount: input.amount,
        expense_date: input.expenseDate,
        vendor_name: input.vendorName ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return (data as unknown) as BosExpense
  },
}
