import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  FileSearch,
  RefreshCw,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import type { PlagiarismCheck } from "@/features/plagiarism";
import { plagiarismService } from "@/features/plagiarism";
import { PlagiarismBadge } from "@/features/plagiarism";
import { usePageTitle } from "@/hooks/usePageTitle";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { GC, STALE } from "@/utils/queryConstants";

// ─── Query Keys ────────────────────────────────────────────────────────────────

const plagiarismKeys = createQueryKeys("plagiarism_checks");

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRowClass(check: PlagiarismCheck): string {
  if (check.status !== "completed" || check.similarity_score === null)
    return "";
  if (check.similarity_score > 50)
    return "bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20";
  if (check.similarity_score >= 30)
    return "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20";
  return "bg-emerald-50/40 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20";
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "internal":
      return "Internal";
    case "copyleaks":
      return "Copyleaks";
    default:
      return provider;
  }
}

// ─── Summary Statistics ──────────────────────────────────────────────────────

interface SummaryStats {
  total: number;
  highRisk: number;
  needsReview: number;
  clear: number;
  processing: number;
}

function computeStats(checks: PlagiarismCheck[]): SummaryStats {
  let highRisk = 0;
  let needsReview = 0;
  let clear = 0;
  let processing = 0;

  for (const c of checks) {
    if (c.status === "processing" || c.status === "pending") {
      processing++;
    } else if (c.status === "completed" && c.similarity_score !== null) {
      if (c.similarity_score > 50) highRisk++;
      else if (c.similarity_score >= 30) needsReview++;
      else clear++;
    }
  }

  return { total: checks.length, highRisk, needsReview, clear, processing };
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {[
              "ID Pengumpulan",
              "Provider",
              "Status",
              "Kemiripan",
              "Diperiksa Pada",
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 dark:border-slate-800"
            >
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-48" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-6 w-28 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-6 w-36 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-32" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, colorClass, icon }: StatCardProps) {
  return (
    <Card padding="sm" className="flex items-center gap-4">
      <div className={`flex-shrink-0 rounded-xl p-2.5 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {value}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {label}
        </p>
      </div>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PlagiarismDashboard() {
  usePageTitle("Laporan Plagiarisme");

  const { tenantId } = useAuth();

  const {
    data: checks = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: plagiarismKeys.lists(tenantId ?? ""),
    queryFn: () => plagiarismService.getAllChecks(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.DYNAMIC,
    gcTime: GC.NORMAL,
  });

  const stats = computeStats(checks);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Laporan Plagiarisme
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              Beta
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Riwayat pemeriksaan kemiripan konten pengumpulan tugas
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Perbarui
        </button>
      </div>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="sm" className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Diperiksa"
            value={stats.total}
            colorClass="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            icon={<FileSearch className="w-5 h-5" />}
          />
          <StatCard
            label="Kemiripan Tinggi"
            value={stats.highRisk}
            colorClass="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <StatCard
            label="Perlu Ditinjau"
            value={stats.needsReview}
            colorClass="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <StatCard
            label="Lolos Pemeriksaan"
            value={stats.clear}
            colorClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
            icon={<CheckCircle className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-slate-700 dark:text-slate-200 font-semibold">
              Gagal Memuat Data
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Terjadi kesalahan saat mengambil data laporan plagiarisme.
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Coba Lagi
            </button>
          </div>
        ) : isLoading ? (
          <TableSkeleton />
        ) : checks.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="w-12 h-12" />}
            title="Belum Ada Pemeriksaan"
            description="Belum ada pemeriksaan plagiarisme yang telah dilakukan untuk tenant ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    ID Pengumpulan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Kemiripan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Diperiksa Pada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {checks.map((check) => (
                  <tr
                    key={check.id}
                    className={`transition-colors ${getRowClass(check)}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                      {check.submission_id}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {providerLabel(check.provider)}
                    </td>
                    <td className="px-4 py-3">
                      <PlagiarismBadge score={null} status={check.status} />
                    </td>
                    <td className="px-4 py-3">
                      {check.status === "completed" ? (
                        <PlagiarismBadge
                          score={check.similarity_score}
                          status={check.status}
                        />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(check.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Menampilkan {checks.length} hasil terbaru
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
