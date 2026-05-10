import { Users } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui";

import { useRetentionMatrix } from "../queries/analyticsQueries";
import { RetentionHeatmap } from "./RetentionHeatmap";
import { StickinessDashboard } from "./StickinessDashboard";

interface CohortBuilderProps {
  courseId: string;
}

export function CohortBuilder({ courseId }: CohortBuilderProps) {
  const [weeksBack, setWeeksBack] = useState(8);
  const { data, isLoading } = useRetentionMatrix(courseId, weeksBack);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            Retensi & Kohort
          </h3>
        </div>
        <select
          value={weeksBack}
          onChange={(e) => setWeeksBack(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value={4}>4 minggu</option>
          <option value={8}>8 minggu</option>
          <option value={12}>12 minggu</option>
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          <StickinessDashboard data={data} />
          <RetentionHeatmap data={data} />
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">
          Belum ada data retensi. Data akan muncul setelah siswa mengakses
          pelajaran selama beberapa minggu.
        </p>
      )}
    </div>
  );
}
