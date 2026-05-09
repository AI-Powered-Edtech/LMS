import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Calculator,
  ChevronDown,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/AuthContext";
import { useCourses } from "@/features/courses/queries/courseQueries";
import type { Course } from "@/features/courses/types";
import { gradebookService } from "@/features/gradebook/api/gradebookService";
import { GradebookSkeleton } from "@/features/gradebook/components/GradebookSkeleton";
import { StudentGradeView } from "@/features/gradebook/components/StudentGradeView";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/utils/cn";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  maxScore: number;
  actualScore: number | null;
  weight: number;
}

export function Grades() {
  const { t } = useTranslation();
  usePageTitle(t("grades.pageTitle"));
  const { user, tenantId } = useAuth();
  const [whatIfScores, setWhatIfScores] = useState<
    Record<string, number | null>
  >({});
  const [targetGrade, setTargetGrade] = useState<number>(90);

  // Course selector for StudentGradeView
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const coursesQuery = useCourses({ limit: 50 });

  const { data: submissionsDataRaw, isLoading } = useQuery({
    queryKey: ["student-grades", user?.id, tenantId],
    queryFn: async () => {
      return await gradebookService.getStudentGrades(user!.id, tenantId!);
    },
    enabled: !!user && !!tenantId,
  });

  // Ensure submissionsData is always an array
  const submissionsData = Array.isArray(submissionsDataRaw)
    ? submissionsDataRaw
    : [];

  const assignments: Assignment[] = useMemo(() => {
    if (submissionsData.length === 0)
      return [
        {
          id: "1",
          title: t("grades.defaultAssignments.midterm"),
          subject: t("grades.defaultSubject"),
          maxScore: 100,
          actualScore: null,
          weight: 30,
        },
        {
          id: "2",
          title: t("grades.defaultAssignments.groupTask"),
          subject: t("grades.defaultSubject"),
          maxScore: 100,
          actualScore: null,
          weight: 20,
        },
        {
          id: "3",
          title: t("grades.defaultAssignments.quiz"),
          subject: t("grades.defaultSubject"),
          maxScore: 100,
          actualScore: null,
          weight: 10,
        },
        {
          id: "4",
          title: t("grades.defaultAssignments.final"),
          subject: t("grades.defaultSubject"),
          maxScore: 100,
          actualScore: null,
          weight: 40,
        },
      ];
    const equalWeight = Math.floor(100 / submissionsData.length);
    return (
      submissionsData as unknown as Array<{
        id: string;
        score: number | null;
        assignments: {
          title: string;
          max_points?: number;
          classes?: { name?: string } | null;
        };
      }>
    ).map((s, i) => ({
      id: s.id,
      title: s.assignments.title,
      subject:
        (s.assignments.classes as { name?: string } | null)?.name ??
        t("grades.defaultSubject"),
      maxScore: s.assignments.max_points ?? 100,
      actualScore: s.score ?? null,
      weight:
        i === submissionsData.length - 1
          ? 100 - equalWeight * (submissionsData.length - 1)
          : equalWeight,
    }));
  }, [submissionsData, t]);

  const calculateGrade = (useWhatIf: boolean) => {
    let totalWeight = 0,
      earnedPoints = 0;
    assignments.forEach((a) => {
      const score =
        a.actualScore !== null
          ? a.actualScore
          : useWhatIf
            ? (whatIfScores[a.id] ?? null)
            : null;
      if (score !== null) {
        totalWeight += a.weight;
        earnedPoints += (score / a.maxScore) * a.weight;
      }
    });
    return totalWeight === 0 ? 0 : (earnedPoints / totalWeight) * 100;
  };

  const currentGrade = calculateGrade(false);
  const projectedGrade = calculateGrade(true);

  if (isLoading) {
    return <GradebookSkeleton />;
  }

  const courses: Course[] = coursesQuery.data?.courses ?? [];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* ── Nilai per Kursus (Gradebook) ──────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              {t("grades.perCourse.title")}
            </h2>
            <div className="relative">
              <select
                value={selectedCourseId ?? ""}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className={cn(
                  "appearance-none pl-3 pr-9 py-2 rounded-xl text-sm font-medium",
                  "border border-slate-200 dark:border-slate-600",
                  "bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                  "min-w-[200px]",
                )}
              >
                <option value="">{t("grades.perCourse.placeholder")}</option>
                {courses.map((c: Course) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedCourseId ? (
            <StudentGradeView courseId={selectedCourseId} />
          ) : (
            <div className="flex items-center justify-center h-20 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {t("grades.perCourse.empty")}
              </p>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            {t("grades.whatIf.title")}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {submissionsData.length > 0
              ? t("grades.whatIf.subtitleWithCount").replace(
                  "__COUNT__",
                  String(submissionsData.length),
                )
              : t("grades.whatIf.subtitleEmpty")}
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-bold text-slate-500 mb-1">
              {t("grades.whatIf.currentScore")}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-200">
                {currentGrade.toFixed(1)}
              </span>
              <span className="text-slate-400 font-medium mb-1">
                {t("grades.whatIf.outOf")}
              </span>
            </div>
          </div>

          <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-200 flex flex-col justify-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <p className="text-sm font-bold text-blue-100 mb-1 relative z-10">
              {t("grades.whatIf.projection")}
            </p>
            <div className="flex items-end gap-2 relative z-10">
              <span className="text-4xl font-black">
                {projectedGrade.toFixed(1)}
              </span>
              <span className="text-blue-200 font-medium mb-1">
                {t("grades.whatIf.outOf")}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-bold text-slate-500">
                {t("grades.whatIf.target")}
              </p>
              <Target className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={targetGrade}
                onChange={(e) => setTargetGrade(Number(e.target.value))}
                className="text-4xl font-black text-slate-800 dark:text-white w-24 bg-transparent outline-none border-b-2 border-dashed border-slate-300 dark:border-slate-600 focus:border-orange-500 transition-colors"
                min="0"
                max="100"
              />
              <span className="text-slate-400 font-medium">
                {t("grades.whatIf.outOf")}
              </span>
            </div>
            {projectedGrade >= targetGrade ? (
              <p className="text-xs font-bold text-green-500 mt-2">
                {t("grades.whatIf.targetReached")}
              </p>
            ) : (
              <p className="text-xs font-bold text-orange-500 mt-2">
                {t("grades.whatIf.targetShort").replace(
                  "__SHORT__",
                  (targetGrade - projectedGrade).toFixed(1),
                )}
              </p>
            )}
          </div>
        </div>

        {/* Assignments list */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-200">
                {t("grades.assignments.title")}
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {t("grades.assignments.weightTotal")}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">
                    {a.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {t("grades.assignments.weightLabel")
                      .replace("__SUBJECT__", a.subject)
                      .replace("__WEIGHT__", String(a.weight))}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {a.actualScore !== null ? (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {t("grades.assignments.originalScore")}
                      </span>
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-600">
                        {a.actualScore} / {a.maxScore}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calculator className="w-3 h-3" />
                        {t("grades.assignments.whatIfScore")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400 mr-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                          {t("grades.assignments.notGraded")}
                        </span>
                        <input
                          type="number"
                          placeholder="-"
                          value={
                            whatIfScores[a.id] === undefined ||
                            whatIfScores[a.id] === null
                              ? ""
                              : whatIfScores[a.id]!
                          }
                          onChange={(e) => {
                            const v =
                              e.target.value === ""
                                ? null
                                : Math.min(
                                    a.maxScore,
                                    Math.max(0, Number(e.target.value)),
                                  );
                            setWhatIfScores((prev) => ({ ...prev, [a.id]: v }));
                          }}
                          className="w-16 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 text-blue-700 dark:text-blue-300 font-bold rounded-lg outline-none text-center transition-colors placeholder:text-blue-300 dark:placeholder:text-blue-700"
                        />
                        <span className="text-slate-400 font-medium text-sm">
                          / {a.maxScore}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t("grades.assignments.totalProjection")}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("grades.assignments.totalSubtitle")}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-600">
                {projectedGrade.toFixed(1)}
              </span>
              <span className="text-slate-400 font-medium text-sm ml-1">
                {t("grades.whatIf.outOf")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
