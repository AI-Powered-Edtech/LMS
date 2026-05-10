import { Activity, Loader2 } from "lucide-react";

import { EngagementTrend } from "@/features/analytics/components/EngagementTrend";
import { FunnelChart } from "@/features/analytics/components/FunnelChart";
import { RetentionHeatmap } from "@/features/analytics/components/RetentionHeatmap";
import { RiskRadar } from "@/features/analytics/components/RiskRadar";
import { SegmentPieChart } from "@/features/analytics/components/SegmentPieChart";
import {
  useAtRiskStudents,
  useEngagementSummary,
  useEngagementTrend,
  useFunnelList,
  useFunnelResults,
  useRetentionMatrix,
} from "@/features/analytics/queries/analyticsQueries";
import { LeaderboardV2 } from "@/features/gamification/components/LeaderboardV2";

import type { WidgetConfig } from "../types";

interface WidgetRendererProps {
  widget: WidgetConfig;
  courseId?: string;
  className?: string;
}

function MetricCard({
  metric,
  label,
  courseId,
}: {
  metric: string;
  label: string;
  courseId?: string;
}) {
  const { data: summary, isLoading } = useEngagementSummary(courseId ?? "");

  const getValue = () => {
    if (!summary) return "-";
    switch (metric) {
      case "total_students":
        return summary.reduce(
          (a: number, r: { student_count: number }) => a + r.student_count,
          0,
        );
      case "at_risk_count":
        return (
          summary.find((r: { segment: string }) => r.segment === "at_risk")
            ?.student_count ?? 0
        );
      case "avg_engagement": {
        // ⚡ Perf: consolidate multiple chained array traversals into a single pass to reduce O(N) operations.
        let total = 0;
        let high = 0;
        let med = 0;
        for (let i = 0; i < summary.length; i++) {
          const r = summary[i] as { segment: string; student_count: number };
          total += r.student_count;
          if (r.segment === "high") high = r.student_count;
          else if (r.segment === "medium") med = r.student_count;
        }
        if (total === 0) return "-";
        return `${Math.round(((high * 100 + med * 60) / (total * 100)) * 100)}%`;
      }
      case "avg_completion":
        return `${Math.round(
          summary.reduce(
            (a: number, r) =>
              a +
              ((r as unknown as { avg_completion_pct?: number })
                .avg_completion_pct ?? 0),
            0,
          ) / Math.max(summary.length, 1),
        )}%`;
      default:
        return "-";
    }
  };

  if (isLoading)
    return <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
        {String(getValue())}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

function PieChartWidget({ courseId }: { courseId?: string }) {
  const { data: summary, isLoading } = useEngagementSummary(courseId ?? "");
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  return <SegmentPieChart data={summary ?? []} />;
}

function EngagementTrendWidget({ courseId }: { courseId?: string }) {
  const { data: trend, isLoading } = useEngagementTrend(courseId ?? "", 14);
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  return <EngagementTrend data={trend ?? []} />;
}

function RiskRadarWidget({ courseId }: { courseId?: string }) {
  const { data: predictions, isLoading } = useAtRiskStudents(courseId ?? "");
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  return <RiskRadar data={predictions ?? []} />;
}

function HeatmapWidget({ courseId }: { courseId?: string }) {
  const { data: retention, isLoading } = useRetentionMatrix(courseId ?? "", 8);
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  return <RetentionHeatmap data={retention ?? []} />;
}

function FunnelWidget({ courseId }: { courseId?: string }) {
  const { data: funnels, isLoading: funnelLoading } = useFunnelList(courseId);
  const firstFunnelId = funnels?.[0]?.funnel_id ?? "";
  const { data: results, isLoading: resultsLoading } =
    useFunnelResults(firstFunnelId);

  if (funnelLoading || resultsLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  if (!results || results.length === 0)
    return (
      <p className="text-center text-sm text-slate-400 py-8">
        Belum ada data funnel.
      </p>
    );
  return <FunnelChart data={results} />;
}

function PlaceholderWidget({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500">
      <Activity className="h-8 w-8" />
      <p className="text-xs font-medium">{type}</p>
    </div>
  );
}

export function WidgetRenderer({
  widget,
  courseId,
  className,
}: WidgetRendererProps) {
  const label = (widget.config?.label as string) ?? "";
  const metric = (widget.config?.metric as string) ?? "";

  return (
    <div className={`h-full w-full overflow-hidden ${className ?? ""}`}>
      {widget.type === "metric_card" && (
        <MetricCard metric={metric} label={label} courseId={courseId} />
      )}
      {widget.type === "pie_chart" && <PieChartWidget courseId={courseId} />}
      {widget.type === "engagement_trend" && (
        <EngagementTrendWidget courseId={courseId} />
      )}
      {widget.type === "risk_radar" && <RiskRadarWidget courseId={courseId} />}
      {widget.type === "heatmap" && <HeatmapWidget courseId={courseId} />}
      {widget.type === "funnel" && <FunnelWidget courseId={courseId} />}
      {widget.type === "leaderboard" && (
        <div className="h-full overflow-y-auto">
          <LeaderboardV2 />
        </div>
      )}
      {![
        "metric_card",
        "pie_chart",
        "engagement_trend",
        "risk_radar",
        "heatmap",
        "funnel",
        "leaderboard",
      ].includes(widget.type) && <PlaceholderWidget type={widget.type} />}
    </div>
  );
}
