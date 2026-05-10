// ==========================================================================
// AttendanceDetailPage — Kalender kehadiran bulanan untuk orang tua
// Menggantikan ComingSoonPage di /app/parent/kehadiran
// ==========================================================================

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

import { useChildAttendance } from "../queries/useChildAttendance";
import { useParentChildren } from "../queries/useParentChildren";
import type { AttendanceDay, ChildInfo } from "../types";

// ── Status Config ───────────────────────────────────────────────

const STATUS_CONFIG = {
  hadir: {
    emoji: "✅",
    label: "Hadir",
    bg: "bg-green-100 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-300",
    dotColor: "bg-green-500",
  },
  sakit: {
    emoji: "🤒",
    label: "Sakit",
    bg: "bg-yellow-100 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-300",
    dotColor: "bg-yellow-500",
  },
  izin: {
    emoji: "📝",
    label: "Izin",
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    dotColor: "bg-blue-500",
  },
  alpha: {
    emoji: "❌",
    label: "Alpha",
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    dotColor: "bg-red-500",
  },
} as const;

const DAY_HEADERS = ["Sen", "Sel", "Rab", "Kam", "Jum"] as const;

// ── Helper Components ───────────────────────────────────────────

function ChildDropdown({
  children,
  selectedId,
  onSelect,
}: {
  children: ChildInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (children.length <= 1) return null;

  return (
    <select
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full min-h-[44px] rounded-xl
                 bg-white dark:bg-slate-800
                 border border-slate-200 dark:border-slate-700
                 text-sm font-medium text-slate-700 dark:text-slate-300
                 px-3
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label="Pilih anak"
    >
      {children.map((child) => (
        <option key={child.student_id} value={child.student_id}>
          {child.student_name} — {child.class_name}
        </option>
      ))}
    </select>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-2 w-full" />
      </div>
      <SkeletonCard lines={5} />
    </div>
  );
}

// ── Summary Card ────────────────────────────────────────────────

interface MonthlySummary {
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  total: number;
  rate: number;
}

function SummaryCard({ summary }: { summary: MonthlySummary }) {
  const rateColor =
    summary.rate >= 85
      ? "text-green-600 dark:text-green-400"
      : summary.rate >= 70
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const barColor =
    summary.rate >= 85
      ? "bg-green-500 dark:bg-green-400"
      : summary.rate >= 70
        ? "bg-yellow-500 dark:bg-yellow-400"
        : "bg-red-500 dark:bg-red-400";

  const items = [
    {
      label: "Hadir",
      value: summary.hadir,
      emoji: "✅",
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Sakit",
      value: summary.sakit,
      emoji: "🤒",
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Izin",
      value: summary.izin,
      emoji: "📝",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Alpha",
      value: summary.alpha,
      emoji: "❌",
      color: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          📊
        </span>
        <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Ringkasan Bulan Ini
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {items.map(({ label, value, emoji, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl
                       bg-slate-50 dark:bg-slate-800/50
                       border border-slate-100 dark:border-slate-700/40
                       py-2 px-1"
          >
            <span className="text-base" aria-hidden="true">
              {emoji}
            </span>
            <span className={cn("text-lg font-bold", color)}>{value}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Attendance rate */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Tingkat Kehadiran
          </span>
          <span className={cn("text-sm font-bold", rateColor)}>
            {summary.total > 0 ? `${summary.rate}%` : "—"}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              barColor,
            )}
            style={{ width: `${Math.min(summary.rate, 100)}%` }}
            role="progressbar"
            aria-valuenow={summary.rate}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </Card>
  );
}

// ── Calendar Grid ───────────────────────────────────────────────

function CalendarGrid({
  currentMonth,
  attendanceMap,
}: {
  currentMonth: Date;
  attendanceMap: Map<string, AttendanceDay["status"]>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all days in the month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter only weekdays (Mon-Fri) — getDay: 0=Sun, 1=Mon, ..., 6=Sat
  const weekdays = allDays.filter((d) => {
    const day = getDay(d);
    return day >= 1 && day <= 5;
  });

  // Group by week (weeks start on Monday)
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  for (const day of weekdays) {
    const dayOfWeek = getDay(day); // 1=Mon ... 5=Fri
    if (currentWeek.length > 0 && dayOfWeek === 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          📅
        </span>
        <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          {format(currentMonth, "MMMM yyyy", { locale: idLocale })}
        </h2>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-5 gap-1">
        {DAY_HEADERS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => {
          // Determine which column each day should go in (Mon=0, Tue=1, etc.)
          const cells: (Date | null)[] = [null, null, null, null, null];
          for (const day of week) {
            const colIdx = getDay(day) - 1; // Mon=0, Tue=1, ...Fri=4
            cells[colIdx] = day;
          }

          return (
            <div key={weekIdx} className="grid grid-cols-5 gap-1">
              {cells.map((day, colIdx) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${weekIdx}-${colIdx}`}
                      className="aspect-square"
                    />
                  );
                }

                const dateStr = format(day, "yyyy-MM-dd");
                const isFuture = isAfter(day, today);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const status = attendanceMap.get(dateStr);
                const hasData = status !== undefined && !isFuture;
                const config = hasData ? STATUS_CONFIG[status] : null;
                const dayNumber = day.getDate();

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center",
                      "text-xs transition-colors",
                      !isCurrentMonth && "opacity-30",
                      isFuture
                        ? "bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600"
                        : hasData && config
                          ? cn(config.bg)
                          : "bg-slate-50 dark:bg-slate-800/30",
                    )}
                    aria-label={`${dayNumber}: ${isFuture ? "Belum terjadi" : hasData && config ? config.label : "Tidak ada data"}`}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-semibold leading-none",
                        isFuture
                          ? "text-slate-400 dark:text-slate-600"
                          : hasData && config
                            ? config.text
                            : "text-slate-400 dark:text-slate-500",
                      )}
                    >
                      {dayNumber}
                    </span>
                    <span
                      className="text-sm leading-none mt-0.5"
                      aria-hidden="true"
                    >
                      {isFuture ? "" : hasData && config ? config.emoji : "○"}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Legend ───────────────────────────────────────────────────────

function Legend() {
  const items = [
    { emoji: "✅", label: "Hadir" },
    { emoji: "🤒", label: "Sakit" },
    { emoji: "📝", label: "Izin" },
    { emoji: "❌", label: "Alpha" },
    { emoji: "○", label: "Tidak ada data" },
  ];

  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base" aria-hidden="true">
          📝
        </span>
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Legenda
        </h3>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map(({ emoji, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
          >
            <span aria-hidden="true">{emoji}</span>
            {label}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ── Empty State ─────────────────────────────────────────────────

function EmptyAttendance() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        📅
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Belum ada data kehadiran
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          Data kehadiran anak Anda belum tersedia untuk bulan ini.
        </p>
      </div>
    </div>
  );
}

// ── Error State ─────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        😔
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Gagal memuat data kehadiran. Silakan periksa koneksi internet Anda.
      </p>
      <button
        onClick={onRetry}
        className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-medium
                   active:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2
                   focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Coba Lagi
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export function AttendanceDetailPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const childrenQuery = useParentChildren();
  const children = childrenQuery.data ?? [];
  const effectiveStudentId =
    selectedStudentId || (children.length > 0 ? children[0].student_id : "");

  const attendanceQuery = useChildAttendance(effectiveStudentId, year, month);
  const attendanceDays = useMemo(
    () => attendanceQuery.data ?? [],
    [attendanceQuery.data],
  );

  // Build attendance map
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceDay["status"]>();
    for (const day of attendanceDays) {
      map.set(day.date, day.status);
    }
    return map;
  }, [attendanceDays]);

  // Calculate summary
  const summary = useMemo((): MonthlySummary => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count only past weekdays in this month
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const pastWeekdays = allDays.filter((d) => {
      const day = getDay(d);
      return day >= 1 && day <= 5 && !isAfter(d, today);
    });

    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpha = 0;

    for (const day of pastWeekdays) {
      const dateStr = format(day, "yyyy-MM-dd");
      const status = attendanceMap.get(dateStr);
      if (status === "hadir") hadir++;
      else if (status === "sakit") sakit++;
      else if (status === "izin") izin++;
      else alpha++;
    }

    const total = pastWeekdays.length;
    const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { hadir, sakit, izin, alpha, total, rate };
  }, [attendanceMap, currentMonth]);

  // Determine if we can go to next month (no future beyond current month)
  const now = new Date();
  const canGoNext =
    currentMonth.getFullYear() < now.getFullYear() ||
    (currentMonth.getFullYear() === now.getFullYear() &&
      currentMonth.getMonth() < now.getMonth());

  // Loading children
  if (childrenQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <AttendanceSkeleton />
      </div>
    );
  }

  // No children
  if (!childrenQuery.isLoading && children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
        <span className="text-5xl" aria-hidden="true">
          👨‍👩‍👧‍👦
        </span>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Tidak ada siswa yang terhubung ke akun Anda.
        </p>
        <Link
          to="/app/parent"
          className="text-sm text-blue-600 dark:text-blue-400 font-medium"
        >
          ← Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/parent"
          className="flex items-center justify-center w-9 h-9 rounded-xl
                     bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400
                     active:bg-slate-200 dark:active:bg-slate-700 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Kembali"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Kehadiran
        </h1>
      </div>

      {/* Child switcher */}
      <ChildDropdown
        children={children}
        selectedId={effectiveStudentId}
        onSelect={setSelectedStudentId}
      />

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center
                     rounded-xl bg-slate-100 dark:bg-slate-800
                     text-slate-600 dark:text-slate-400
                     active:bg-slate-200 dark:active:bg-slate-700 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Bulan sebelumnya"
        >
          <span aria-hidden="true">←</span>
        </button>

        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {format(currentMonth, "MMMM yyyy", { locale: idLocale })}
        </span>

        <button
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className={cn(
            "min-h-[40px] min-w-[40px] flex items-center justify-center",
            "rounded-xl transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            canGoNext
              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:bg-slate-200 dark:active:bg-slate-700"
              : "bg-slate-50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 cursor-not-allowed",
          )}
          aria-label="Bulan berikutnya"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Content */}
      {attendanceQuery.error && !attendanceQuery.isLoading ? (
        <ErrorState onRetry={() => attendanceQuery.refetch()} />
      ) : attendanceQuery.isLoading ? (
        <AttendanceSkeleton />
      ) : attendanceDays.length === 0 && summary.total === 0 ? (
        <EmptyAttendance />
      ) : (
        <>
          {/* Summary */}
          <SummaryCard summary={summary} />

          {/* Calendar */}
          <CalendarGrid
            currentMonth={currentMonth}
            attendanceMap={attendanceMap}
          />

          {/* Legend */}
          <Legend />
        </>
      )}
    </div>
  );
}
