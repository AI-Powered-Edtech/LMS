import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Download,
  Filter,
  Plus,
} from "lucide-react";

import { Breadcrumb, EmptyState } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import type { Course } from "@/features/courses/types";
import { AddAssignmentModal } from "@/features/gradebook/components/AddAssignmentModal";
import { GradebookMainTable } from "@/features/gradebook/components/GradebookMainTable";
import { GradebookStats } from "@/features/gradebook/components/GradebookStats";
import { GradebookTable } from "@/features/gradebook/components/GradebookTable";
import { useGradebookState } from "@/features/gradebook/hooks/useGradebookState";
import { exportGradebookToCSV } from "@/features/gradebook/utils/csvExport";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

export function Gradebook() {
  const { t } = useTranslation();
  const s = useGradebookState();
  const addToast = useToast((s) => s.addToast);
  const { role } = useAuth();
  const dashboardHref =
    role === "admin" ? "/app/admin/dashboard" : "/app/teacher/dashboard";

  const handleExportCSV = () => {
    if (!s.selectedCourseId) {
      addToast({
        type: "warning",
        message: t("gradebook.toast.pickCourseFirst"),
      });
      return;
    }
    const selectedCourse = s.courses.find((c) => c.id === s.selectedCourseId);

    const entries = Object.entries(s.grades).flatMap(
      ([studentId, studentGrades]) =>
        Object.entries(studentGrades ?? {}).map(
          ([assignmentId, entry]): {
            id: string;
            student_id: string;
            assignment_id: string | null;
            quiz_id: string | null;
            score: number | null;
            max_score: number;
            percentage: number;
            grade_letter: string | null;
          } => ({
            id: `${studentId}-${assignmentId}`,
            student_id: studentId,
            assignment_id: assignmentId.startsWith("quiz-")
              ? null
              : assignmentId,
            quiz_id: assignmentId.startsWith("quiz-")
              ? assignmentId.replace("quiz-", "")
              : null,
            score: entry?.score ?? null,
            max_score: 100,
            percentage: entry?.score ?? 0,
            grade_letter: null,
          }),
        ),
    );

    const columns = s.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: (a.type === "quiz" ? "quiz" : "assignment") as
        | "quiz"
        | "assignment",
      max_score: a.maxScore,
    }));

    const students = s.students.map((st) => ({
      id: st.id,
      name: st.name,
      email: st.nis + "@edusync.sch.id",
    }));

    exportGradebookToCSV({
      entries,
      columns,
      students,
      className: selectedCourse?.title,
    });
    addToast({ type: "success", message: t("gradebook.toast.exportSuccess") });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print-page-root">
      <Breadcrumb
        items={[
          { label: t("gradebook.breadcrumb.dashboard"), href: dashboardHref },
          { label: t("gradebook.breadcrumb.grades") },
        ]}
        className="mb-2"
      />
      {/* Gradebook per Kursus (data DB) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-200">
                {t("gradebook.perCourseTitle")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("gradebook.perCourseSubtitle")}
              </p>
            </div>
          </div>

          <div className="relative">
            <select
              value={s.selectedCourseId}
              onChange={(e) => s.setSelectedCourseId(e.target.value)}
              data-testid="gradebook-course-selector"
              aria-label={t("gradebook.courseSelector.ariaLabel")}
              className={cn(
                "appearance-none pl-3 pr-9 py-2 rounded-xl text-sm font-medium",
                "border border-slate-200 dark:border-slate-600",
                "bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                "min-w-[200px]",
              )}
            >
              <option value="">
                {t("gradebook.courseSelector.placeholder")}
              </option>
              {s.courses.map((c: Course) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {s.selectedCourseId ? (
          <GradebookTable courseId={s.selectedCourseId} />
        ) : s.courses.length === 0 ? (
          <EmptyState
            title={t("gradebook.empty.noCourses.title")}
            description={t("gradebook.empty.noCourses.description")}
          />
        ) : (
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {t("gradebook.empty.pickCourse")}
            </p>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <button
              type="button"
              aria-label={t("gradebook.header.back")}
              onClick={() => window.history.back()}
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            {t("gradebook.header.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-2 sm:ml-11 text-sm sm:text-base">
            {t("gradebook.header.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 print-hidden">
          <button
            onClick={() => s.setIsAddModalOpen(true)}
            data-testid="gradebook-add-column"
            aria-label={t("gradebook.actions.addColumnAria")}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {t("gradebook.actions.addColumn")}
            </span>
          </button>
          <button
            type="button"
            aria-label={t("gradebook.actions.filter")}
            className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm sm:text-base shadow-sm transition-all"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">
              {t("gradebook.actions.filter")}
            </span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            data-testid="gradebook-export-csv"
            aria-label={t("gradebook.actions.exportCsv")}
            className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm sm:text-base shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">
              {t("gradebook.actions.exportCsv")}
            </span>
          </button>
        </div>
      </div>

      <AddAssignmentModal
        isOpen={s.isAddModalOpen}
        newAssignment={s.newAssignment}
        onClose={() => s.setIsAddModalOpen(false)}
        onSubmit={s.handleAddAssignment}
        onUpdate={s.setNewAssignment}
      />

      <GradebookStats
        classAverage={s.classAverage}
        highestScore={s.highestScore}
        lowestScore={s.lowestScore}
        highestStudent={s.highestStudent}
        lowestStudent={s.lowestStudent}
      />

      <GradebookMainTable
        filteredStudents={s.filteredStudents}
        assignments={s.assignments}
        grades={s.grades}
        studentStatsMap={s.studentStatsMap}
        editingCell={s.editingCell}
        editValue={s.editValue}
        searchQuery={s.searchQuery}
        onSearchChange={s.setSearchQuery}
        onCellClick={s.handleCellClick}
        onSaveEdit={s.handleSaveEdit}
        onCancelEdit={() => s.setEditingCell(null)}
        onEditValueChange={s.setEditValue}
        onKeyDown={s.handleKeyDown}
      />
    </div>
  );
}
