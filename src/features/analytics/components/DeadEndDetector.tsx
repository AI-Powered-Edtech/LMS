import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

import type { LearningPath } from "../types";

interface Props {
  paths: LearningPath[];
}

interface DeadEnd {
  lesson_id: string;
  lesson_title: string;
  user_count: number;
  avg_completion_pct: number;
}

function findDeadEnds(paths: LearningPath[]): DeadEnd[] {
  const deadEndMap = new Map<string, DeadEnd>();

  for (const path of paths) {
    const steps = path.path_steps;
    if (steps.length === 0) continue;
    const lastStep = steps[steps.length - 1];
    if (!lastStep.is_completed) {
      const existing = deadEndMap.get(lastStep.lesson_id);
      if (existing) {
        existing.user_count += path.user_count;
      } else {
        deadEndMap.set(lastStep.lesson_id, {
          lesson_id: lastStep.lesson_id,
          lesson_title: lastStep.lesson_title,
          user_count: path.user_count,
          avg_completion_pct: lastStep.completion_pct,
        });
      }
    }
  }

  return Array.from(deadEndMap.values()).sort(
    (a, b) => b.user_count - a.user_count,
  );
}

export function DeadEndDetector({ paths }: Props) {
  // ⚡ Perf: memoize findDeadEnds — O(paths × steps) with Map + sort, recomputed on every render otherwise
  const deadEnds = useMemo(() => findDeadEnds(paths), [paths]);

  if (deadEnds.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        Tidak ada dead end terdeteksi. Semua jalur berakhir dengan pelajaran
        yang selesai.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Pelajaran di mana siswa berhenti dan tidak melanjutkan:
      </p>
      <div className="space-y-2">
        {deadEnds.map((dead) => (
          <div
            key={dead.lesson_id}
            className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/10"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                {dead.lesson_title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selesai rata-rata {dead.avg_completion_pct.toFixed(0)}%
              </p>
            </div>
            <span className="flex-shrink-0 text-sm font-semibold text-red-600 dark:text-red-400">
              {dead.user_count} siswa berhenti
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
