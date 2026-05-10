import {
  ArrowLeft,
  CheckCircle2,
  Download,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { AttemptDetailModal } from "@/components/AttemptDetailModal";
import { QuestionDifficultyPanel } from "@/features/quizzes/components/QuestionDifficultyPanel";
import { QuizGradebookFilters } from "@/features/quizzes/components/QuizGradebookFilters";
import { QuizGradebookTable } from "@/features/quizzes/components/QuizGradebookTable";
import { useQuizGradebookState } from "@/features/quizzes/hooks/useQuizGradebookState";
import { cn } from "@/utils/cn";

export function QuizGradebook() {
  const s = useQuizGradebookState();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <Link
              to="/teacher-dashboard"
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            Buku Nilai Kuis
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-9 text-sm">
            Rekap nilai assignment kuis per kelas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={s.handleExportCSV}
            disabled={!s.selectedAssignment || s.filteredAttempts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button
            onClick={s.loadAttempts}
            disabled={!s.selectedAssignment || s.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw
              className={cn("w-4 h-4", s.isLoading && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </div>

      <QuizGradebookFilters
        classes={s.classes}
        assignments={s.assignments}
        selectedClass={s.selectedClass}
        selectedAssignment={s.selectedAssignment}
        isAssignmentLoading={s.isAssignmentLoading}
        onClassChange={s.setSelectedClass}
        onAssignmentChange={s.setSelectedAssignment}
      />

      {s.selectedAssignment && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Rata-rata Skor",
              value: `${s.avgScore}`,
              sub: "dari 100",
              icon: <TrendingUp className="w-4 h-4" />,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "Total Percobaan",
              value: `${s.filteredAttempts.length}`,
              sub: "attempt",
              icon: <HelpCircle className="w-4 h-4" />,
              color: "bg-purple-50 text-purple-600",
            },
            {
              label: "Lulus",
              value: `${s.passCount}`,
              sub: `${s.filteredAttempts.length > 0 ? Math.round((s.passCount / s.filteredAttempts.length) * 100) : 0}% pass rate`,
              icon: <CheckCircle2 className="w-4 h-4" />,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Tidak Lulus",
              value: `${s.failCount}`,
              sub: `nilai < ${s.passingScore}`,
              icon: <XCircle className="w-4 h-4" />,
              color: "bg-red-50 text-red-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
                  {stat.label}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    stat.color,
                  )}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                {stat.value}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>
      )}

      <QuizGradebookTable
        filteredAttempts={s.filteredAttempts}
        selectedAssignment={s.selectedAssignment}
        selectedAssignmentTitle={s.selectedAssignmentInfo?.title}
        passingScore={s.passingScore}
        isLoading={s.isLoading}
        searchQuery={s.searchQuery}
        error={s.error}
        onSearchChange={s.setSearchQuery}
        onOpenAttemptDetail={s.handleOpenAttemptDetail}
      />

      {s.selectedAssignment && (
        <QuestionDifficultyPanel
          questionDifficulty={s.questionDifficulty}
          isDifficultyLoading={s.isDifficultyLoading}
        />
      )}

      {s.selectedAttemptId && (
        <AttemptDetailModal
          attemptId={s.selectedAttemptId}
          studentName={s.selectedStudentName}
          score={s.selectedScore}
          passed={s.selectedPassed}
          onClose={s.handleCloseAttemptDetail}
          onGraded={s.loadAttempts}
        />
      )}
    </div>
  );
}
