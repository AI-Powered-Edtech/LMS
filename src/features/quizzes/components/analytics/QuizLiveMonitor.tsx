// QuizLiveMonitor — Real-time student progress monitoring (polling 10 detik)
// Teacher-only component. Polling-based (bukan WebSocket).

import { useQuery } from "@tanstack/react-query";

import {
  quizAnalyticsService,
  type QuizLiveStatus,
} from "../../api/quizAnalyticsService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizLiveMonitorProps {
  assignmentId: string;
  tenantId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deteksi apakah heartbeat siswa sudah lebih dari N menit yang lalu */
function isInactive(
  lastHeartbeat: string | null,
  thresholdMinutes = 5,
): boolean {
  if (!lastHeartbeat) return false;
  const diffMs = Date.now() - new Date(lastHeartbeat).getTime();
  return diffMs > thresholdMinutes * 60 * 1000;
}

/** Format timestamp ke HH:MM:SS lokal */
function toTimeString(ts: number): string {
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Hitung berapa menit sejak heartbeat terakhir */
function minutesSince(ts: string | null): number {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ row }: { row: QuizLiveStatus }) {
  const inactive =
    isInactive(row.last_heartbeat_at) && row.status === "in_progress";

  if (inactive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        ⏰ Tidak Aktif
      </span>
    );
  }

  if (row.is_suspicious) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
        🔴 Mencurigakan
      </span>
    );
  }

  switch (row.status.toLowerCase()) {
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
          🟢 Sedang Mengerjakan
        </span>
      );
    case "submitted":
    case "graded":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          ✅ Selesai
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          — {row.status}
        </span>
      );
  }
}

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
        {answered}/{total}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-lg border px-4 py-3 ${
        color
      } dark:border-opacity-30`}
    >
      <span className="text-2xl font-bold">{value}</span>
      <span className="mt-0.5 text-xs font-medium">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function QuizLiveMonitor({
  assignmentId,
  tenantId,
  className = "",
}: QuizLiveMonitorProps) {
  const {
    data: liveStatus = [],
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["quiz-live-status", assignmentId],
    queryFn: () => quizAnalyticsService.getLiveStatus(assignmentId, tenantId),
    refetchInterval: 10_000,
    staleTime: 9_000,
    enabled: !!assignmentId && !!tenantId,
  });

  // --- Computed summaries ---
  const total = liveStatus.length;
  const inProgress = liveStatus.filter(
    (s) =>
      s.status.toLowerCase() === "in_progress" &&
      !isInactive(s.last_heartbeat_at) &&
      !s.is_suspicious,
  ).length;
  const done = liveStatus.filter(
    (s) =>
      s.status.toLowerCase() === "submitted" ||
      s.status.toLowerCase() === "graded",
  ).length;
  const suspicious = liveStatus.filter(
    (s) =>
      s.is_suspicious ||
      (isInactive(s.last_heartbeat_at) && s.status === "in_progress"),
  ).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Monitor Kuis Langsung
        </h3>
        {dataUpdatedAt > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Terakhir diperbarui: {toTimeString(dataUpdatedAt)}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total Siswa"
          value={total}
          color="border-gray-200 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
        <SummaryCard
          label="Sedang Mengerjakan"
          value={inProgress}
          color="border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
        />
        <SummaryCard
          label="Selesai"
          value={done}
          color="border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
        />
        <SummaryCard
          label="Mencurigakan"
          value={suspicious}
          color="border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {[
                "Nama Siswa",
                "Status",
                "Progres",
                "Heartbeat Terakhir",
                "Skor",
                "Tab Berpindah",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : liveStatus.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  Belum ada siswa yang memulai kuis ini.
                </td>
              </tr>
            ) : (
              liveStatus.map((row) => {
                const inactive =
                  isInactive(row.last_heartbeat_at) &&
                  row.status === "in_progress";
                const rowClass = inactive
                  ? "bg-amber-50 dark:bg-amber-900/10"
                  : row.is_suspicious
                    ? "bg-red-50 dark:bg-red-900/10"
                    : "";

                return (
                  <tr
                    key={row.student_id}
                    className={`transition-colors ${rowClass}`}
                  >
                    {/* Nama */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {row.student_name}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <StatusBadge row={row} />
                    </td>

                    {/* Progres */}
                    <td className="px-4 py-3">
                      <ProgressBar
                        answered={row.answered_count}
                        total={row.total_questions}
                      />
                    </td>

                    {/* Heartbeat */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {row.last_heartbeat_at ? (
                        <span
                          className={
                            inactive
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : ""
                          }
                        >
                          {minutesSince(row.last_heartbeat_at)} menit lalu
                          {inactive && " ⚠️"}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Skor */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.score !== null ? (
                        <span className="font-semibold">{row.score}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Tab berpindah */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={
                          row.tab_switch_count > 5
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : row.tab_switch_count > 2
                              ? "font-medium text-amber-600 dark:text-amber-400"
                              : "text-gray-600 dark:text-gray-400"
                        }
                      >
                        {row.tab_switch_count}×
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="text-right text-xs text-gray-400 dark:text-gray-500">
        Data diperbarui otomatis setiap 10 detik.
      </p>
    </div>
  );
}
