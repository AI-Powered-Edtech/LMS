// ==========================================================================
// PendingAssignmentList — Daftar tugas yang belum diselesaikan
// ==========================================================================

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

import type { PendingAssignment } from "../types";

interface PendingAssignmentListProps {
  assignments: PendingAssignment[];
  isLoading?: boolean;
}

/** Format tanggal deadline menjadi teks mudah dibaca */
function formatDeadline(dueDateStr: string): string {
  if (!dueDateStr) return "Tidak ada batas waktu";

  const dueDate = new Date(dueDateStr);
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // Sudah lewat
    const absDays = Math.abs(diffDays);
    if (absDays === 0) return "Terlambat hari ini";
    if (absDays === 1) return "Terlambat 1 hari";
    return `Terlambat ${absDays} hari`;
  }

  if (diffHours < 24) {
    if (diffHours === 0) return "Kurang dari 1 jam lagi";
    return `${diffHours} jam lagi`;
  }

  if (diffDays === 1) return "Besok";
  if (diffDays <= 7) return `${diffDays} hari lagi`;

  return dueDate.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function PendingAssignmentList({
  assignments,
  isLoading,
}: PendingAssignmentListProps) {
  return (
    <Card padding="sm" className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            📝
          </span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            TUGAS BELUM SELESAI
          </h2>
        </div>
        {!isLoading && assignments.length > 0 && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
            {assignments.length}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3 px-1">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 items-start">
              <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && assignments.length === 0 && (
        <div className="flex items-center gap-3 px-1 py-2">
          <span className="text-2xl" aria-hidden="true">
            🎉
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Semua tugas sudah dikerjakan!
          </p>
        </div>
      )}

      {/* Assignment list */}
      {!isLoading && assignments.length > 0 && (
        <ul className="space-y-2" role="list">
          {assignments.map((assignment) => {
            const deadline = formatDeadline(assignment.due_date);

            return (
              <li
                key={assignment.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-xl",
                  assignment.is_overdue
                    ? "bg-red-50 dark:bg-red-950/20"
                    : "bg-slate-50 dark:bg-slate-800/40",
                )}
                aria-label={`${assignment.title}: ${deadline}`}
              >
                {/* Icon */}
                <span
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base",
                    assignment.is_overdue
                      ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                      : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
                  )}
                  aria-hidden="true"
                >
                  {assignment.is_overdue ? "⚠️" : "📌"}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium leading-tight truncate",
                      assignment.is_overdue
                        ? "text-red-700 dark:text-red-300"
                        : "text-slate-800 dark:text-slate-200",
                    )}
                  >
                    {assignment.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {assignment.subject}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] font-medium mt-0.5",
                      assignment.is_overdue
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {deadline}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
