// ==========================================================================
// GradesDetailPage — Halaman detail nilai anak untuk orang tua
// Menggantikan ComingSoonPage di /app/parent/nilai
// ==========================================================================

import { useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

import { useChildGrades } from "../queries/useChildGrades";
import { useParentChildren } from "../queries/useParentChildren";
import type { ChildGradeSummary, ChildInfo } from "../types";

// ── Helper Components ───────────────────────────────────────────

function TrendIcon({ trend }: { trend: ChildGradeSummary["trend"] }) {
  if (trend === "up") {
    return (
      <span
        className="text-green-600 dark:text-green-400 font-bold text-lg leading-none"
        aria-label="Naik"
      >
        ↑
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span
        className="text-red-500 dark:text-red-400 font-bold text-lg leading-none"
        aria-label="Turun"
      >
        ↓
      </span>
    );
  }
  return (
    <span
      className="text-slate-400 dark:text-slate-500 font-bold text-lg leading-none"
      aria-label="Stabil"
    >
      →
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500 dark:bg-green-400"
      : score >= 60
        ? "bg-yellow-500 dark:bg-yellow-400"
        : "bg-red-500 dark:bg-red-400";

  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(score, 100)}%` }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

// ── Child Dropdown ──────────────────────────────────────────────

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

// ── Skeleton ────────────────────────────────────────────────────

function GradesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-2 w-full" />
      </div>
      {/* Subject skeletons */}
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}

// ── Summary Card ────────────────────────────────────────────────

function SummaryCard({ grades }: { grades: ChildGradeSummary[] }) {
  const avg =
    grades.length > 0
      ? Math.round(
          (grades.reduce((sum, g) => sum + g.latest_score, 0) / grades.length) *
            10,
        ) / 10
      : 0;

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          📊
        </span>
        <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Ringkasan
        </h2>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Rata-rata:
        </span>
        <span className={cn("text-2xl font-bold", scoreColor(avg))}>{avg}</span>
      </div>

      <ScoreBar score={avg} />

      <p className="text-xs text-slate-400 dark:text-slate-500">
        {grades.length} mata pelajaran tercatat
      </p>
    </Card>
  );
}

// ── Subject Card ────────────────────────────────────────────────

function SubjectCard({ grade }: { grade: ChildGradeSummary }) {
  // Derive extra info from the grade data
  // Since API only gives latest_score, previous_score, trend — we show what's available
  return (
    <Card padding="md" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[65%]">
          {grade.subject}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn("text-xl font-bold", scoreColor(grade.latest_score))}
          >
            {grade.latest_score}
          </span>
          <TrendIcon trend={grade.trend} />
        </div>
      </div>

      <ScoreBar score={grade.latest_score} />

      {/* Previous score comparison */}
      {grade.previous_score !== null && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Nilai sebelumnya: {grade.previous_score}
        </p>
      )}
    </Card>
  );
}

// ── Empty State ─────────────────────────────────────────────────

function EmptyGrades() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        📊
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Belum ada data nilai
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          Data nilai anak Anda belum tersedia. Nilai akan muncul setelah guru
          memasukkan penilaian.
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
        Gagal memuat data nilai. Silakan periksa koneksi internet Anda.
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

export function GradesDetailPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const childrenQuery = useParentChildren();
  const children = childrenQuery.data ?? [];
  const effectiveStudentId =
    selectedStudentId || (children.length > 0 ? children[0].student_id : "");

  const gradesQuery = useChildGrades(effectiveStudentId);
  const grades = gradesQuery.data ?? [];

  // Loading children
  if (childrenQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <GradesSkeleton />
      </div>
    );
  }

  // No children linked
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
          Nilai Anak Saya
        </h1>
      </div>

      {/* Child switcher */}
      <ChildDropdown
        children={children}
        selectedId={effectiveStudentId}
        onSelect={setSelectedStudentId}
      />

      {/* Error */}
      {gradesQuery.error && !gradesQuery.isLoading ? (
        <ErrorState onRetry={() => gradesQuery.refetch()} />
      ) : gradesQuery.isLoading ? (
        <GradesSkeleton />
      ) : grades.length === 0 ? (
        <EmptyGrades />
      ) : (
        <>
          {/* Summary */}
          <SummaryCard grades={grades} />

          {/* Per-subject section header */}
          <div className="flex items-center gap-2 px-1 pt-2">
            <span className="text-lg" aria-hidden="true">
              📚
            </span>
            <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Per Mata Pelajaran
            </h2>
          </div>

          {/* Subject cards */}
          <div className="space-y-3">
            {grades.map((grade) => (
              <SubjectCard key={grade.subject} grade={grade} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
