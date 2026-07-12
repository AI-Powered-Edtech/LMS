/**
 * SuspiciousAttemptsPanel — Teacher anti-cheat review component
 *
 * Shows flagged quiz attempts with detailed cheating signal data.
 * Teachers can see which students triggered anti-cheat detection.
 */

import { AlertTriangle, Eye, Loader2, Shield, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui";
import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";
import { translateQuizAttemptStatus } from "@/utils/statusTranslations";

import {
  getSuspiciousAttempts,
  type SuspiciousAttempt,
} from "../../api/suspiciousAttempts.service";

interface SuspiciousAttemptsPanelProps {
  quizId: string;
  tenantId: string;
  className?: string;
}

const severityConfig = {
  high: {
    label: "Tinggi",
    color: "text-red-700",
    bg: "bg-red-100",
    border: "border-red-200",
    icon: ShieldAlert,
  },
  medium: {
    label: "Sedang",
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
    icon: AlertTriangle,
  },
  low: {
    label: "Rendah",
    color: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-200",
    icon: Eye,
  },
};

export function SuspiciousAttemptsPanel({
  quizId,
  tenantId,
  className,
}: SuspiciousAttemptsPanelProps) {
  const [attempts, setAttempts] = useState<SuspiciousAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getSuspiciousAttempts(quizId, tenantId);
        setAttempts(data);
      } catch (err) {
        if (import.meta.env.DEV)
          logger.error("Failed to load suspicious attempts:", err);
        setError("Gagal memuat data kecurangan");
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId && tenantId) {
      void fetchData();
    }
  }, [quizId, tenantId]);

  const filteredAttempts =
    filterSeverity === "all"
      ? attempts
      : attempts.filter((a) => a.severity === filterSeverity);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">
            Memuat data anti-cheat...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title="Tidak ada aktivitas mencurigakan"
          description="Semua percobaan kuis ini berjalan tanpa deteksi kecurangan."
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
        />
      </div>
    );
  }

  // ⚡ Bolt: Single pass aggregation to avoid redundant intermediate arrays and O(N) iterations
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  for (const a of attempts) {
    if (a.severity === "high") highCount++;
    else if (a.severity === "medium") mediumCount++;
    else if (a.severity === "low") lowCount++;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Deteksi Kecurangan
        </h3>
        <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {attempts.length} terdeteksi
        </span>
      </div>

      {/* Severity Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { key: "high" as const, count: highCount },
          { key: "medium" as const, count: mediumCount },
          { key: "low" as const, count: lowCount },
        ].map(({ key, count }) => {
          const config = severityConfig[key];
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() =>
                setFilterSeverity(filterSeverity === key ? "all" : key)
              }
              className={cn(
                "p-3 rounded-xl border text-center transition-all",
                filterSeverity === key
                  ? `${config.bg} ${config.border} ring-2 ring-offset-1 dark:ring-offset-slate-800`
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700",
                filterSeverity === key && key === "high" && "ring-red-300",
                filterSeverity === key && key === "medium" && "ring-amber-300",
                filterSeverity === key && key === "low" && "ring-blue-300",
              )}
            >
              <Icon className={cn("w-5 h-5 mx-auto mb-1", config.color)} />
              <p className="text-xl font-black text-slate-800 dark:text-white">
                {count}
              </p>
              <p className={cn("text-xs font-bold", config.color)}>
                {config.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Attempt List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAttempts.map((attempt) => {
          const config = severityConfig[attempt.severity];
          const Icon = config.icon;
          return (
            <div
              key={attempt.attempt_id}
              className={cn("p-3 rounded-xl border", config.bg, config.border)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4 shrink-0", config.color)} />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">
                      {attempt.student_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Skor: {attempt.score ?? "-"}% · Status:{" "}
                      {translateQuizAttemptStatus(attempt.status)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-bold rounded-full",
                    config.bg,
                    config.color,
                  )}
                >
                  {config.label}
                </span>
              </div>

              {/* Signal Details */}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {attempt.tab_switch_count > 0 && (
                  <span className="px-2 py-1 bg-white/60 dark:bg-slate-700/40 rounded-lg text-slate-700 dark:text-slate-300">
                    🔄 Tab switch: <b>{attempt.tab_switch_count}x</b>
                  </span>
                )}
                {attempt.window_blur_count > 0 && (
                  <span className="px-2 py-1 bg-white/60 dark:bg-slate-700/40 rounded-lg text-slate-700 dark:text-slate-300">
                    👁️ Window blur: <b>{attempt.window_blur_count}x</b>
                  </span>
                )}
                {attempt.other_signal_count > 0 && (
                  <span className="px-2 py-1 bg-white/60 dark:bg-slate-700/40 rounded-lg text-slate-700 dark:text-slate-300">
                    ⚠️ Lainnya: <b>{attempt.other_signal_count}x</b>
                  </span>
                )}
              </div>

              {attempt.first_signal_at && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Pertama:{" "}
                  {new Date(attempt.first_signal_at).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {attempt.last_signal_at &&
                    attempt.last_signal_at !== attempt.first_signal_at && (
                      <>
                        {" "}
                        · Terakhir:{" "}
                        {new Date(attempt.last_signal_at).toLocaleString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </>
                    )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
