import { Zap } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui";

import {
  useEngagementSummary,
  useEngagementTrend,
} from "../queries/analyticsQueries";
import { EngagementRadar } from "./EngagementRadar";
import { EngagementTrend } from "./EngagementTrend";
import { SegmentPieChart } from "./SegmentPieChart";

interface EngagementDashboardProps {
  courseId: string;
}

const TABS = ["Distribusi", "Tren", "Radar"] as const;
type Tab = (typeof TABS)[number];

export function EngagementDashboard({ courseId }: EngagementDashboardProps) {
  const [tab, setTab] = useState<Tab>("Distribusi");
  const { data: summary, isLoading: sumLoading } =
    useEngagementSummary(courseId);
  const { data: trend, isLoading: trendLoading } = useEngagementTrend(courseId);

  const isLoading = sumLoading || trendLoading;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
          Skor Keterlibatan
        </h3>
      </div>

      {/* Summary stats */}
      {!isLoading && summary && summary.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {(["high", "medium", "low", "at_risk"] as const).map((seg) => {
            const row = summary.find((r) => r.segment === seg);
            return (
              <div
                key={seg}
                className="rounded-lg border border-slate-100 p-2 text-center dark:border-slate-700"
              >
                <p className="text-xs text-slate-500">
                  {seg === "high"
                    ? "Tinggi"
                    : seg === "medium"
                      ? "Sedang"
                      : seg === "low"
                        ? "Rendah"
                        : "Berisiko"}
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {row?.student_count ?? 0}
                </p>
                <p className="text-xs text-slate-400">
                  {row ? `${row.avg_score}` : "–"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <>
          {tab === "Distribusi" && <SegmentPieChart data={summary ?? []} />}
          {tab === "Tren" && <EngagementTrend data={trend ?? []} />}
          {tab === "Radar" && <EngagementRadar summary={summary ?? []} />}
        </>
      )}
    </div>
  );
}
