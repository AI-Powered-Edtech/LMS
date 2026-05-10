/**
 * finance.ts — Tipe data untuk modul Finance Dashboard (SPP/Keuangan).
 *
 * Mencakup:
 *  - InvoiceRecord    : baris tunggal invoice (dari view finance_invoice_details)
 *  - FinanceOverview  : statistik ringkasan bulanan
 *  - MonthlyData      : data per bulan untuk chart
 *  - InvoiceStatus    : union type status tagihan
 */

// ---------------------------------------------------------------------------
// Status tagihan (normalized to lowercase)
// ---------------------------------------------------------------------------

export type InvoiceStatus =
  | "paid"
  | "pending"
  | "open"
  | "overdue"
  | "draft"
  | "void";

// ---------------------------------------------------------------------------
// Satu baris invoice dari view finance_invoice_details
// ---------------------------------------------------------------------------

export interface InvoiceRecord {
  id: string;
  tenant_id: string;
  student_id: string | null;
  student_name: string | null;
  student_email: string | null;
  amount_due: number;
  amount_paid: number;
  status: InvoiceStatus | string;
  description: string | null;
  month_year: string | null; // format: 'YYYY-MM'
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Ringkasan overview
// ---------------------------------------------------------------------------

export interface FinanceOverview {
  total_this_month: number;
  paid_this_month: number;
  unpaid_total: number;
  payment_rate: number; // persen, 0–100
}

// ---------------------------------------------------------------------------
// Data per bulan untuk chart
// ---------------------------------------------------------------------------

export interface MonthlyData {
  month_label: string; // e.g. 'Jan 26'
  month_key: string; // e.g. '2026-01'
  total: number;
  paid: number;
}

// ---------------------------------------------------------------------------
// Return type dari useFinanceData hook
// ---------------------------------------------------------------------------

export interface FinanceDataResult {
  overviewStats: FinanceOverview | null;
  invoices: InvoiceRecord[];
  monthlyData: MonthlyData[];
  totalCount: number;
  isLoading: boolean;
  isOverviewLoading: boolean;
  isMonthlyLoading: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

export type InvoiceStatusFilter = "all" | "paid" | "pending" | "overdue";

export interface InvoiceFilter {
  status: InvoiceStatusFilter;
  search: string;
  page: number;
  pageSize: number;
}
