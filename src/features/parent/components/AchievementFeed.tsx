// ==========================================================================
// AchievementFeed — Pencapaian terbaru siswa (badge/XP)
// ==========================================================================

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface AchievementFeedProps {
  achievements: string[];
  isLoading?: boolean;
}

/** Pilih icon berdasarkan teks achievement */
function getAchievementIcon(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("badge") || lower.includes("meraih")) return "🥇";
  if (lower.includes("xp")) return "⭐";
  if (lower.includes("pelajaran") || lower.includes("menyelesaikan"))
    return "📗";
  if (lower.includes("kuis")) return "✏️";
  return "🏆";
}

export function AchievementFeed({
  achievements,
  isLoading,
}: AchievementFeedProps) {
  return (
    <Card padding="sm" className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-lg" aria-hidden="true">
          🏆
        </span>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          PENCAPAIAN TERBARU
        </h2>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2.5 px-1">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && achievements.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 px-1 py-1">
          Belum ada pencapaian minggu ini. Semangat!
        </p>
      )}

      {/* Achievement list */}
      {!isLoading && achievements.length > 0 && (
        <ul className="space-y-2" role="list">
          {achievements.map((achievement, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2.5 px-1"
              aria-label={achievement}
            >
              <span
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm"
                aria-hidden="true"
              >
                {getAchievementIcon(achievement)}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                {achievement}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
