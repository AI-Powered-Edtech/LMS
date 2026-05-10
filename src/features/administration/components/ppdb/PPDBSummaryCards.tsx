import { Clock, GraduationCap, UserCheck, Users, UserX } from "lucide-react";

import { cn } from "@/utils/cn";

import type { PPDBSummary } from "../../types/ppdb";

interface OverviewCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
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
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
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

interface PPDBSummaryCardsProps {
  summary: PPDBSummary;
  loading: boolean;
}

export function PPDBSummaryCards({ summary, loading }: PPDBSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      <OverviewCard
        icon={<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        label="Total Pendaftar"
        value={summary.total}
        loading={loading}
      />
      <OverviewCard
        icon={
          <GraduationCap className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        }
        iconBg="bg-slate-100 dark:bg-slate-700"
        label="Kuota"
        value={summary.quota}
        subLabel={
          summary.total > 0
            ? `${Math.round((summary.accepted / summary.quota) * 100)}% terisi`
            : undefined
        }
        loading={loading}
      />
      <OverviewCard
        icon={
          <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        }
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        label="Diterima"
        value={summary.accepted}
        loading={loading}
      />
      <OverviewCard
        icon={<UserX className="w-6 h-6 text-red-600 dark:text-red-400" />}
        iconBg="bg-red-100 dark:bg-red-900/30"
        label="Ditolak"
        value={summary.rejected}
        loading={loading}
      />
      <OverviewCard
        icon={<Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        label="Menunggu"
        value={summary.pending + summary.reviewed}
        subLabel={
          summary.waitlisted > 0
            ? `+ ${summary.waitlisted} cadangan`
            : undefined
        }
        loading={loading}
      />
    </div>
  );
}
