import { CheckCircle2, Clock, TrendingUp, Wallet } from "lucide-react";

import { formatCurrency as formatRupiah } from "@/shared/utils/format-id";
import { cn } from "@/utils/cn";

import type { FinanceOverview } from "../../types/finance";

interface OverviewCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subLabel?: string;
  loading?: boolean;
}

function OverviewCard({
  icon,
  iconBg,
  label,
  value,
  subLabel,
  loading,
}: OverviewCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-start gap-4 shadow-sm">
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          iconBg,
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
          {label}
        </p>
        {loading ? (
          <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
            {value}
          </p>
        )}
        {subLabel && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}

interface FinanceSummaryCardsProps {
  overviewStats: FinanceOverview | null;
  loading: boolean;
}

export function FinanceSummaryCards({
  overviewStats,
  loading,
}: FinanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <OverviewCard
        icon={<Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        label="Total Tagihan Bulan Ini"
        value={
          overviewStats ? formatRupiah(overviewStats.total_this_month) : "Rp 0"
        }
        subLabel="Total semua tagihan bulan berjalan"
        loading={loading}
      />
      <OverviewCard
        icon={
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        }
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        label="Sudah Dibayar"
        value={
          overviewStats ? formatRupiah(overviewStats.paid_this_month) : "Rp 0"
        }
        subLabel="Tagihan lunas bulan berjalan"
        loading={loading}
      />
      <OverviewCard
        icon={<Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        label="Belum Dibayar"
        value={
          overviewStats ? formatRupiah(overviewStats.unpaid_total) : "Rp 0"
        }
        subLabel="Pending & terlambat keseluruhan"
        loading={loading}
      />
      <OverviewCard
        icon={
          <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        }
        iconBg="bg-purple-100 dark:bg-purple-900/30"
        label="Tingkat Pembayaran"
        value={overviewStats ? `${overviewStats.payment_rate}%` : "0%"}
        subLabel="Persentase tagihan bulan ini terlunasi"
        loading={loading}
      />
    </div>
  );
}
