// ==========================================================================
// AttendanceWeekGrid — Grid kehadiran 5 hari (Senin-Jumat)
// ==========================================================================

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

import type { AttendanceDay } from "../types";

interface AttendanceWeekGridProps {
  attendance: AttendanceDay[];
  isLoading?: boolean;
}

// Label hari (Senin-Jumat)
const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum"] as const;

const STATUS_CONFIG = {
  hadir: {
    emoji: "✅",
    label: "Hadir",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800/40",
    text: "text-green-700 dark:text-green-300",
  },
  sakit: {
    emoji: "🤒",
    label: "Sakit",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800/40",
    text: "text-blue-700 dark:text-blue-300",
  },
  izin: {
    emoji: "📝",
    label: "Izin",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-800/40",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  alpha: {
    emoji: "❌",
    label: "Alpha",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/40",
    text: "text-red-700 dark:text-red-300",
  },
} as const;

/** Cek apakah tanggal belum terjadi (hari ini ke depan) */
function isFutureDay(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) > today;
}

export function AttendanceWeekGrid({
  attendance,
  isLoading,
}: AttendanceWeekGridProps) {
  // Pastikan selalu 5 slot — pad jika kurang
  const slots = attendance.slice(0, 5);

  return (
    <Card padding="sm" className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-lg" aria-hidden="true">
          📅
        </span>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          KEHADIRAN MINGGU INI
        </h2>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && slots.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 px-1 py-2">
          Data kehadiran belum tersedia.
        </p>
      )}

      {/* Grid */}
      {!isLoading && slots.length > 0 && (
        <div
          className="grid grid-cols-5 gap-1.5"
          role="list"
          aria-label="Kehadiran minggu ini"
        >
          {slots.map((day, idx) => {
            const isFuture = isFutureDay(day.date);
            const config = STATUS_CONFIG[day.status];
            const dayLabel = DAY_LABELS[idx] ?? "?";

            return (
              <div
                key={day.date}
                role="listitem"
                aria-label={`${dayLabel}: ${isFuture ? "Belum terjadi" : config.label}`}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border py-2 px-1",
                  "min-h-[60px]",
                  isFuture
                    ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/40 opacity-50"
                    : cn(config.bg, config.border),
                )}
              >
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {dayLabel}
                </span>
                <span className="text-xl leading-none" aria-hidden="true">
                  {isFuture ? "—" : config.emoji}
                </span>
                {!isFuture && (
                  <span
                    className={cn("text-[9px] font-medium mt-1", config.text)}
                  >
                    {config.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      {!isLoading && slots.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-1 border-t border-slate-100 dark:border-slate-800">
          {(
            Object.entries(STATUS_CONFIG) as [
              keyof typeof STATUS_CONFIG,
              (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG],
            ][]
          ).map(([key, cfg]) => (
            <span
              key={key}
              className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400"
            >
              {cfg.emoji} {cfg.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
