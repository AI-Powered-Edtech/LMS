// ==========================================================================
// GradeCard — Daftar nilai terbaru dengan trend arrows
// ==========================================================================

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

import type { ChildGradeSummary } from "../types";

interface GradeCardProps {
  grades: ChildGradeSummary[];
  isLoading?: boolean;
}

function TrendIcon({ trend }: { trend: ChildGradeSummary["trend"] }) {
  if (trend === "up") {
    return (
      <span
        className="text-green-600 dark:text-green-400 font-bold text-base leading-none"
        aria-label="Naik"
      >
        ↑
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span
        className="text-red-500 dark:text-red-400 font-bold text-base leading-none"
        aria-label="Turun"
      >
        ↓
      </span>
    );
  }
  return (
    <span
      className="text-slate-400 dark:text-slate-500 font-bold text-base leading-none"
      aria-label="Stabil"
    >
      →
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500 dark:bg-green-400"
      : score >= 60
        ? "bg-yellow-500 dark:bg-yellow-400"
        : "bg-red-500 dark:bg-red-400";

  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(score, 100)}%` }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export function GradeCard({ grades, isLoading }: GradeCardProps) {
  return (
    <Card padding="sm" className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-lg" aria-hidden="true">
          📊
        </span>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          NILAI TERBARU
        </h2>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3 px-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && grades.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 px-1 py-2">
          Belum ada nilai yang tercatat.
        </p>
      )}

      {/* Grade list */}
      {!isLoading && grades.length > 0 && (
        <ul className="space-y-2.5" role="list">
          {grades.map((grade) => (
            <li key={grade.subject} className="px-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                  {grade.subject}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      grade.latest_score >= 80
                        ? "text-green-600 dark:text-green-400"
                        : grade.latest_score >= 60
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {grade.latest_score}
                  </span>
                  <TrendIcon trend={grade.trend} />
                </div>
              </div>
              <ScoreBar score={grade.latest_score} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
