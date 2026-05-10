// ==========================================================================
// MonthlyReportPage — Laporan Perkembangan Bulanan untuk Orang Tua
// Wave 4 — Task 29.6
//
// Mobile-first, print-friendly, dark mode support.
// ==========================================================================

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { formatDate } from "@/shared/utils/format-id";
import { cn } from "@/utils/cn";
import { STALE } from "@/utils/queryConstants";

import { getMyChildren } from "../api/parentApi";
import { getAvailableReportMonths, getMonthlyReport } from "../api/reportApi";
import type { ParentMonthlyReport } from "../types";
import { canNativeShare, printReport, shareReport } from "../utils/reportPrint";

// ── Query Keys ──────────────────────────────────────────────────

const base = createQueryKeys("parent-report");

const reportKeys = {
  children: (tenantId: string) => [...base.all(tenantId), "children"] as const,
  months: (tenantId: string, studentId: string) =>
    [...base.all(tenantId), "available-months", studentId] as const,
  monthly: (tenantId: string, studentId: string, month: number, year: number) =>
    [...base.all(tenantId), "monthly", studentId, year, month] as const,
};

// ── Skeleton ────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-4 animate-pulse print:hidden">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center print:hidden">
      <span className="text-5xl" aria-hidden="true">
        📋
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Belum ada data untuk bulan ini
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          Data aktivitas belajar untuk bulan ini belum tersedia. Coba pilih
          bulan lain.
        </p>
      </div>
    </div>
  );
}

// ── Error State ─────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center print:hidden">
      <span className="text-4xl" aria-hidden="true">
        😔
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Gagal memuat laporan. Periksa koneksi internet Anda.
      </p>
      <button
        onClick={onRetry}
        className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-medium
                   active:bg-blue-700 transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  );
}

// ── Section Card ────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80
                 dark:border-slate-700/60 overflow-hidden
                 print:border print:border-slate-300 print:rounded-none print:mb-4"
    >
      <div
        className="flex items-center gap-2 px-4 py-3
                   bg-slate-50 dark:bg-slate-800
                   border-b border-slate-200/80 dark:border-slate-700/60
                   print:bg-slate-100"
      >
        <span className="text-base" aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Attendance Bar ───────────────────────────────────────────────

function AttendanceBar({ rate }: { rate: number }) {
  const color =
    rate >= 85 ? "bg-green-500" : rate >= 70 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, rate)}%` }}
        role="progressbar"
        aria-valuenow={rate}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

// ── Score Badge ─────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"
      : score >= 70
        ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300"
        : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5",
        "text-xs font-bold rounded-lg",
        color,
      )}
    >
      {score}
    </span>
  );
}

// ── Achievement Icon ────────────────────────────────────────────

function achievementIcon(type: "badge" | "level_up" | "streak"): string {
  if (type === "badge") return "🥇";
  if (type === "level_up") return "⬆️";
  return "🔥";
}

// ── Study Time Formatter ─────────────────────────────────────────

function formatStudyTime(minutes: number): string {
  if (minutes === 0) return "0 menit";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} menit`;
  if (m === 0) return `${h} jam`;
  return `${h}j ${m}m`;
}

// ── Report Content ───────────────────────────────────────────────

function ReportContent({ report }: { report: ParentMonthlyReport }) {
  return (
    <div className="space-y-4 print:space-y-0">
      {/* Student Info */}
      <div
        className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-4
                   text-white print:bg-blue-600 print:rounded-none print:mb-4"
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full bg-white/20 flex-shrink-0 flex items-center
                       justify-center text-xl overflow-hidden"
            aria-hidden="true"
          >
            {report.student.avatar ? (
              <img
                src={report.student.avatar}
                alt={report.student.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              "👤"
            )}
          </div>
          {/* Name + Class */}
          <div>
            <p className="font-bold text-base leading-tight">
              {report.student.name}
            </p>
            <p className="text-blue-100 text-sm">{report.student.class}</p>
            <p className="text-blue-200 text-xs mt-0.5">
              {report.period.month_name}
            </p>
          </div>
        </div>
      </div>

      {/* Akademik */}
      <SectionCard icon="📊" title="Ringkasan Akademik">
        {/* Overall average */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Rata-rata Keseluruhan
          </span>
          <span
            className={cn(
              "text-lg font-bold",
              report.academic.overall_avg >= 80
                ? "text-green-600 dark:text-green-400"
                : report.academic.overall_avg >= 70
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400",
            )}
          >
            {report.academic.overall_avg || "—"}
          </span>
        </div>

        {report.academic.subjects.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
            Belum ada data nilai bulan ini
          </p>
        ) : (
          <div className="space-y-2">
            {report.academic.subjects.map((subject) => (
              <div
                key={subject.name}
                className="flex items-center justify-between gap-2 py-1"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                    {subject.name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {subject.assignments_completed} tugas
                    {subject.quizzes_taken > 0 &&
                      ` · ${subject.quizzes_taken} kuis`}
                  </p>
                </div>
                <ScoreBadge score={subject.avg_score} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Kehadiran */}
      <SectionCard icon="📅" title="Kehadiran">
        <div className="space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Tingkat Kehadiran
              </span>
              <span
                className={cn(
                  "text-sm font-bold",
                  report.attendance.attendance_rate >= 85
                    ? "text-green-600 dark:text-green-400"
                    : report.attendance.attendance_rate >= 70
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400",
                )}
              >
                {report.attendance.total_days > 0
                  ? `${report.attendance.attendance_rate}%`
                  : "—"}
              </span>
            </div>
            <AttendanceBar rate={report.attendance.attendance_rate} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                label: "Hadir",
                value: report.attendance.present,
                color: "text-green-600 dark:text-green-400",
              },
              {
                label: "Sakit",
                value: report.attendance.sick,
                color: "text-yellow-600 dark:text-yellow-400",
              },
              {
                label: "Izin",
                value: report.attendance.excused,
                color: "text-blue-600 dark:text-blue-400",
              },
              {
                label: "Alpha",
                value: report.attendance.absent,
                color: "text-red-600 dark:text-red-400",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={cn("text-lg font-bold", color)}>{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {report.attendance.total_days === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center">
              Belum ada data kehadiran bulan ini
            </p>
          )}
        </div>
      </SectionCard>

      {/* Aktivitas Belajar */}
      <SectionCard icon="📚" title="Aktivitas Belajar">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                ✅
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Pelajaran Selesai
              </span>
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {report.learning.lessons_completed}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                ⏱️
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Total Waktu Belajar
              </span>
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {formatStudyTime(report.learning.total_study_time_minutes)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                🤖
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Sesi AI Tutor
              </span>
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {report.learning.ai_tutor_sessions}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Pencapaian */}
      {report.achievements.length > 0 && (
        <SectionCard icon="🏆" title="Pencapaian Bulan Ini">
          <div className="space-y-2">
            {report.achievements.map((achievement, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0" aria-hidden="true">
                  {achievementIcon(
                    (achievement.type ?? "badge") as
                      | "badge"
                      | "level_up"
                      | "streak",
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {achievement.name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDate(achievement.earned_at, {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Catatan Guru */}
      {report.teacher_notes && (
        <SectionCard icon="💬" title="Catatan Guru">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
            &ldquo;{report.teacher_notes}&rdquo;
          </p>
        </SectionCard>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-6 pt-4 border-t border-slate-300 text-center">
        <p className="text-xs text-slate-400">
          Laporan dibuat melalui EduSync LMS &bull;{" "}
          {formatDate(new Date(), {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function MonthlyReportPage() {
  const { tenantId } = useAuth();
  const params = useParams<{
    studentId?: string;
    year?: string;
    month?: string;
  }>();

  const now = new Date();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    params.studentId ?? "",
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    params.year ? parseInt(params.year, 10) : now.getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    params.month ? parseInt(params.month, 10) : now.getMonth() + 1,
  );
  const [shareStatus, setShareStatus] = useState<"idle" | "copying" | "done">(
    "idle",
  );

  // Fetch children list
  const childrenQuery = useQuery({
    queryKey: reportKeys.children(tenantId ?? ""),
    queryFn: () => getMyChildren(),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  });

  const children = childrenQuery.data ?? [];

  // Auto-select first child if none selected
  const effectiveStudentId =
    selectedStudentId || (children.length > 0 ? children[0].student_id : "");

  // Fetch available months
  const monthsQuery = useQuery({
    queryKey: reportKeys.months(tenantId ?? "", effectiveStudentId),
    queryFn: () => getAvailableReportMonths(effectiveStudentId, tenantId!),
    enabled: !!tenantId && !!effectiveStudentId,
    staleTime: STALE.MODERATE,
  });

  const availableMonths = monthsQuery.data ?? [];

  // Ensure selected month is valid once months loaded
  const effectiveMonth =
    availableMonths.length > 0 &&
    !availableMonths.find(
      (m) => m.month === selectedMonth && m.year === selectedYear,
    )
      ? (availableMonths[0]?.month ?? selectedMonth)
      : selectedMonth;

  const effectiveYear =
    availableMonths.length > 0 &&
    !availableMonths.find(
      (m) => m.month === selectedMonth && m.year === selectedYear,
    )
      ? (availableMonths[0]?.year ?? selectedYear)
      : selectedYear;

  // Fetch report
  const reportQuery = useQuery({
    queryKey: reportKeys.monthly(
      tenantId ?? "",
      effectiveStudentId,
      effectiveMonth,
      effectiveYear,
    ),
    queryFn: () =>
      getMonthlyReport(
        effectiveStudentId,
        effectiveMonth,
        effectiveYear,
        tenantId!,
      ),
    enabled: !!tenantId && !!effectiveStudentId,
    staleTime: STALE.MODERATE,
    retry: 1,
  });

  const selectedChild = children.find(
    (c) => c.student_id === effectiveStudentId,
  );

  // ── Handlers ──
  const handlePrint = () => {
    printReport();
  };

  const handleShare = async () => {
    if (!selectedChild) return;
    const monthData = availableMonths.find(
      (m) => m.month === effectiveMonth && m.year === effectiveYear,
    );
    const monthName = monthData?.label ?? `${effectiveMonth}/${effectiveYear}`;
    setShareStatus("copying");
    const success = await shareReport(selectedChild.student_name, monthName);
    if (success) {
      setShareStatus("done");
      setTimeout(() => setShareStatus("idle"), 2000);
    } else {
      setShareStatus("idle");
    }
  };

  const handleMonthChange = (value: string) => {
    const [yearStr, monthStr] = value.split("-");
    setSelectedYear(parseInt(yearStr, 10));
    setSelectedMonth(parseInt(monthStr, 10));
  };

  // ── Loading children ──
  if (childrenQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <ReportSkeleton />
      </div>
    );
  }

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
    <>
      {/* ── Print CSS (injected via style tag) ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 16px;
            background: white;
            color: black;
          }
          @page {
            size: A5 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="space-y-4 print-area">
        {/* ── Page Header (screen only) ── */}
        <div className="flex items-center gap-3 print:hidden">
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
            Laporan Perkembangan
          </h1>
        </div>

        {/* ── Controls (screen only) ── */}
        <div className="flex items-center gap-2 print:hidden">
          {/* Child selector (if multiple children) */}
          {children.length > 1 && (
            <select
              value={effectiveStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex-1 min-h-[40px] rounded-xl
                         bg-white dark:bg-slate-800
                         border border-slate-200 dark:border-slate-700
                         text-sm text-slate-700 dark:text-slate-300
                         px-3
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Pilih anak"
            >
              {children.map((child) => (
                <option key={child.student_id} value={child.student_id}>
                  {child.student_name}
                </option>
              ))}
            </select>
          )}

          {/* Month selector */}
          <select
            value={`${effectiveYear}-${effectiveMonth}`}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={monthsQuery.isLoading || availableMonths.length === 0}
            className={cn(
              "flex-1 min-h-[40px] rounded-xl",
              "bg-white dark:bg-slate-800",
              "border border-slate-200 dark:border-slate-700",
              "text-sm text-slate-700 dark:text-slate-300",
              "px-3",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "disabled:opacity-50",
            )}
            aria-label="Pilih bulan laporan"
          >
            {monthsQuery.isLoading ? (
              <option>Memuat...</option>
            ) : availableMonths.length === 0 ? (
              <option>Tidak ada data</option>
            ) : (
              availableMonths.map((m) => (
                <option
                  key={`${m.year}-${m.month}`}
                  value={`${m.year}-${m.month}`}
                >
                  {m.label}
                </option>
              ))
            )}
          </select>

          {/* Print / PDF button */}
          <button
            onClick={handlePrint}
            disabled={reportQuery.isLoading || !!reportQuery.error}
            className="min-h-[40px] px-3 rounded-xl
                       bg-blue-600 text-white text-sm font-medium
                       active:bg-blue-700 disabled:opacity-50
                       transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                       flex items-center gap-1.5 flex-shrink-0"
            aria-label="Unduh PDF"
            title="Unduh PDF"
          >
            <span aria-hidden="true">⬇️</span>
            <span className="hidden sm:inline">Unduh PDF</span>
          </button>
        </div>

        {/* ── Share button (screen only, visible when report loaded) ── */}
        {!reportQuery.isLoading && !reportQuery.error && reportQuery.data && (
          <button
            onClick={handleShare}
            disabled={shareStatus === "copying"}
            className={cn(
              "w-full min-h-[44px] rounded-xl text-sm font-medium transition-colors",
              "flex items-center justify-center gap-2",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "print:hidden",
              shareStatus === "done"
                ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300"
                : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-700",
            )}
            aria-label={
              canNativeShare() ? "Bagikan laporan" : "Salin tautan laporan"
            }
          >
            <span aria-hidden="true">
              {shareStatus === "done" ? "✅" : canNativeShare() ? "📤" : "📋"}
            </span>
            {shareStatus === "done"
              ? "Berhasil disalin!"
              : shareStatus === "copying"
                ? "Menyalin..."
                : canNativeShare()
                  ? "Bagikan ke WhatsApp / lainnya"
                  : "Salin tautan laporan"}
          </button>
        )}

        {/* ── Report Content ── */}
        {reportQuery.isLoading ? (
          <ReportSkeleton />
        ) : reportQuery.error ? (
          <ErrorState onRetry={() => reportQuery.refetch()} />
        ) : !reportQuery.data ? (
          <EmptyState />
        ) : (
          <>
            {/* Check if report has any meaningful data */}
            {reportQuery.data.academic.subjects.length === 0 &&
            reportQuery.data.attendance.total_days === 0 &&
            reportQuery.data.learning.lessons_completed === 0 ? (
              <EmptyState />
            ) : (
              <ReportContent report={reportQuery.data} />
            )}
          </>
        )}
      </div>
    </>
  );
}
