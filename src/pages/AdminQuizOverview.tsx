import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
/**
 * AdminQuizOverview — School-wide quiz analytics for admin role
 *
 * Shows a table of all quizzes across the school with metrics,
 * plus a recent anti-cheat audit log.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import {
  type AdminQuizOverviewItem,
  type AntiCheatAuditEntry,
  getAntiCheatAuditLog,
  getSchoolQuizOverview,
} from "@/features/quizzes/api/adminQuiz.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocaleFormatters } from "@/hooks/useLocaleFormatters";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";

type SortKey =
  | "quiz_title"
  | "total_attempts"
  | "avg_score"
  | "pass_rate"
  | "created_at";
type SortDir = "asc" | "desc";

const statusBadge: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draf", color: "text-slate-600", bg: "bg-slate-100" },
  published: {
    label: "Diterbitkan",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  in_review: {
    label: "Dalam Tinjauan",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  approved: {
    label: "Disetujui",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
  archived: {
    label: "Diarsipkan",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
};

export function AdminQuizOverview() {
  usePageTitle("Ikhtisar Kuis Admin");
  const { tenantId } = useAuth();
  const { formatDate, formatDateTime } = useLocaleFormatters();

  const [quizzes, setQuizzes] = useState<AdminQuizOverviewItem[]>([]);
  const [auditLog, setAuditLog] = useState<AntiCheatAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeTab, setActiveTab] = useState<"quizzes" | "audit">("quizzes");

  // ⚡ Perf: Debounce search input to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [quizData, auditData] = await Promise.all([
        getSchoolQuizOverview(tenantId),
        getAntiCheatAuditLog(tenantId, 50),
      ]);
      setQuizzes(quizData);
      setAuditLog(auditData);
    } catch (err) {
      if (import.meta.env.DEV) logger.error("Admin quiz overview error:", err);
      setError("Gagal memuat data kuis");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ⚡ Perf: Memoize filteredQuizzes — was recomputed (filter + sort) on every render
  const filteredQuizzes = useMemo(
    () =>
      quizzes
        .filter(
          (q) =>
            q.quiz_title
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase()) ||
            q.class_name
              ?.toLowerCase()
              .includes(debouncedSearch.toLowerCase()) ||
            q.teacher_name
              ?.toLowerCase()
              .includes(debouncedSearch.toLowerCase()),
        )
        .sort((a, b) => {
          const aVal = a[sortKey];
          const bVal = b[sortKey];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return sortDir === "asc" ? cmp : -cmp;
        }),
    [quizzes, debouncedSearch, sortKey, sortDir],
  );

  // ⚡ Perf: Memoize summary stats — 4 separate array traversals were recomputed on every render.
  // Now computed in a single pass with one useMemo.
  const { totalQuizzes, publishedCount, totalAttempts, avgScore } =
    useMemo(() => {
      let published = 0;
      let attempts = 0;
      let scoreSum = 0;
      let scoreCount = 0;

      for (const q of quizzes) {
        if (q.status === "published") published++;
        attempts += q.total_attempts;
        if (q.avg_score != null) {
          scoreSum += q.avg_score;
          scoreCount++;
        }
      }

      return {
        totalQuizzes: quizzes.length,
        publishedCount: published,
        totalAttempts: attempts,
        avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
      };
    }, [quizzes]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-slate-600 font-medium">
            Memuat data kuis...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex-1 w-full flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
            {error}
          </p>
          <p className="text-sm text-center max-w-md mb-6">
            Terjadi masalah saat memuat ikhtisar kuis sekolah. Periksa koneksi
            Anda atau coba lagi dalam beberapa saat.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => void fetchData()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </button>
            <Link
              to="/app/admin/quiz-manager"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              Kembali ke Quiz Manager
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Overview Kuis Sekolah
        </h1>
        <p className="text-slate-500 mt-1">
          Pantau semua kuis dan aktivitas anti-cheat di seluruh sekolah
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{totalQuizzes}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Kuis
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {publishedCount}
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Diterbitkan
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {totalAttempts}
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Percobaan
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{avgScore}%</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rata-rata
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-4" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "quizzes"}
          onClick={() => setActiveTab("quizzes")}
          className={cn(
            "px-4 py-2 font-bold text-sm border-b-2 transition-colors",
            activeTab === "quizzes"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700",
          )}
        >
          Daftar Kuis
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "audit"}
          onClick={() => setActiveTab("audit")}
          className={cn(
            "px-4 py-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5",
            activeTab === "audit"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-700",
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          Log Anti-Cheat
          {auditLog.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
              {auditLog.length}
            </span>
          )}
        </button>
      </div>

      {/* Quiz Table Tab */}
      {activeTab === "quizzes" && (
        <>
          <div className="flex-1">
            <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Pencarian
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="search-input-1"
                type="text"
                aria-label="Cari kuis, kelas, atau guru"
                placeholder="Cari kuis, kelas, atau guru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {[
                      { key: "quiz_title" as SortKey, label: "Kuis" },
                      { key: "total_attempts" as SortKey, label: "Percobaan" },
                      { key: "avg_score" as SortKey, label: "Rata-rata" },
                      { key: "pass_rate" as SortKey, label: "Kelulusan" },
                      { key: "created_at" as SortKey, label: "Dibuat" },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-xs cursor-pointer hover:text-slate-900 select-none"
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          <ArrowUpDown
                            className={cn(
                              "w-3.5 h-3.5",
                              sortKey === key
                                ? "text-blue-600"
                                : "text-slate-400",
                            )}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuizzes.map((quiz) => {
                    const badge = statusBadge[quiz.status] ?? statusBadge.draft;
                    return (
                      <tr
                        key={quiz.quiz_id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-slate-800">
                              {quiz.quiz_title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {quiz.class_name ?? "No class"} ·{" "}
                              {quiz.teacher_name ?? "Unknown"}
                              {" · "}
                              {quiz.question_count} soal
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded-full",
                              badge.bg,
                              badge.color,
                            )}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {quiz.total_attempts}
                        </td>
                        <td className="px-4 py-3">
                          {quiz.avg_score != null ? (
                            <span
                              className={cn(
                                "font-bold",
                                quiz.avg_score >= 70
                                  ? "text-green-600"
                                  : quiz.avg_score >= 50
                                    ? "text-amber-600"
                                    : "text-red-600",
                              )}
                            >
                              {Math.round(quiz.avg_score)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {quiz.pass_rate != null ? (
                            <span
                              className={cn(
                                "font-bold",
                                quiz.pass_rate >= 70
                                  ? "text-green-600"
                                  : "text-red-600",
                              )}
                            >
                              {Math.round(quiz.pass_rate)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {formatDate(quiz.created_at, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredQuizzes.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        Tidak ada kuis ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {auditLog.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldAlert className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-green-700 font-medium">Log bersih</p>
              <p className="text-sm text-slate-500 mt-1">
                Tidak ada aktivitas mencurigakan yang terdeteksi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-xs">
                      Siswa
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-xs">
                      Kuis
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-xs">
                      Tipe
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-xs">
                      Waktu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLog.map((entry) => (
                    <tr key={entry.signal_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {entry.student_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {entry.quiz_title}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                          {entry.signal_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDateTime(entry.created_at, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
