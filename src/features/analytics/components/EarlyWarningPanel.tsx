import {
  AlertTriangle,
  Loader2,
  ShieldAlert,
  TrendingDown,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/utils/cn";

import {
  useAtRiskStudents,
  usePredictionSummary,
} from "../queries/analyticsQueries";
import type { StudentPrediction } from "../types";
import { PredictionCard } from "./PredictionCard";
import { RiskRadar } from "./RiskRadar";

interface Props {
  courseId: string;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-3", color)}>
      <Icon className="h-5 w-5 flex-shrink-0 opacity-70" />
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs opacity-70">{label}</p>
      </div>
    </div>
  );
}

function riskLabel(risk: number) {
  if (risk >= 0.7)
    return {
      text: "Tinggi",
      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
  if (risk >= 0.4)
    return {
      text: "Sedang",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };
  return {
    text: "Rendah",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
}

export function EarlyWarningPanel({ courseId }: Props) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showRadar, setShowRadar] = useState(false);

  const { data: summary, isLoading: summaryLoading } =
    usePredictionSummary(courseId);
  const { data: students = [], isLoading: studentsLoading } = useAtRiskStudents(
    courseId,
    0.3,
  );

  const isLoading = summaryLoading || studentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-400">Memuat prediksi...</span>
      </div>
    );
  }

  if (!summary || summary.total_students === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            Peringatan Dini
          </h2>
        </div>
        <button
          onClick={() => setShowRadar((v) => !v)}
          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {showRadar ? "Sembunyikan grafik" : "Lihat grafik risiko"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Risiko Tinggi"
          value={summary.high_risk_count}
          icon={ShieldAlert}
          color="border-red-200 text-red-700 dark:border-red-900/40 dark:text-red-400 bg-red-50 dark:bg-red-900/10"
        />
        <SummaryCard
          label="Risiko Sedang"
          value={summary.medium_risk_count}
          icon={AlertTriangle}
          color="border-amber-200 text-amber-700 dark:border-amber-900/40 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10"
        />
        <SummaryCard
          label="Risiko Rendah"
          value={summary.low_risk_count}
          icon={Users}
          color="border-emerald-200 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
        />
        <SummaryCard
          label="Sesi Menurun"
          value={summary.declining_sessions_count}
          icon={TrendingDown}
          color="border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-800"
        />
      </div>

      {/* Risk Radar chart */}
      {showRadar && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 overflow-hidden"
        >
          <RiskRadar data={students} />
        </motion.div>
      )}

      {/* Student table */}
      {students.length > 0 && (
        <div className="space-y-1">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Siswa Berisiko
          </p>
          {students.map((student: StudentPrediction) => {
            const rl = riskLabel(student.churn_risk);
            const isExpanded = expandedUser === student.user_id;
            return (
              <div key={student.user_id}>
                <button
                  onClick={() =>
                    setExpandedUser(isExpanded ? null : student.user_id)
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    "hover:bg-slate-50 dark:hover:bg-slate-800",
                    isExpanded && "bg-slate-50 dark:bg-slate-800",
                  )}
                >
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-white truncate">
                    {student.student_name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      rl.cls,
                    )}
                  >
                    {rl.text}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      student.churn_risk >= 0.7
                        ? "text-red-600 dark:text-red-400"
                        : student.churn_risk >= 0.4
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {(student.churn_risk * 100).toFixed(0)}%
                  </span>
                </button>
                <PredictionCard prediction={student} isExpanded={isExpanded} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
