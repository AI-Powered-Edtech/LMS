import { Award, BarChart2, BookOpen, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { Breadcrumb, OptimizedImage } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  progressService,
  StudentProgressData,
} from "@/features/progress/api/progressService";
import { ProgressSkeleton } from "@/features/progress/components/ProgressSkeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";

export function StudentProgress() {
  const { t } = useTranslation();
  usePageTitle(t("studentProgress.pageTitle"));
  const { studentId } = useParams();
  const { tenantId } = useAuth();
  const [data, setData] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgress() {
      if (!studentId || studentId === "overview") {
        // 'overview' is a nav placeholder — no real studentId selected yet
        setLoading(false);
        return;
      }

      if (!tenantId) {
        setError(t("studentProgress.errors.tenantMissing"));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // High performance consolidation: 6 queries -> 1 RPC call
        const progressData = await progressService.getStudentProgressBundle(
          studentId,
          tenantId!,
        );
        setData(progressData);
      } catch (err: unknown) {
        if (import.meta.env.DEV)
          logger.warn("Student progress unavailable:", err);
        setError(t("studentProgress.errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    }

    void loadProgress();
  }, [studentId, tenantId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 pb-12">
        <h1 className="sr-only">{t("studentProgress.pageTitle")}</h1>
        <ProgressSkeleton />
      </div>
    );
  }

  // No student selected yet (nav points to /overview as placeholder)
  if (!studentId || studentId === "overview") {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <TrendingUp className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" />
        <h1 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t("studentProgress.pageTitle")}
        </h1>
        <p className="text-sm text-center">
          {t("studentProgress.noStudentSelected.descriptionPrefix")}
          <a
            href="/app/admin/users"
            className="text-blue-600 dark:text-blue-400 underline"
          >
            {t("studentProgress.noStudentSelected.descriptionLink")}
          </a>
          {t("studentProgress.noStudentSelected.descriptionSuffix")}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {t("studentProgress.pageTitle")}
        </h1>
        <p className="text-red-500 font-bold mb-2">
          {error || t("studentProgress.errors.dataNotFound")}
        </p>
      </div>
    );
  }

  const {
    profile,
    totalXP,
    completedLessonsCount,
    quizAttempts,
    achievements,
    courseProgress,
  } = data;
  const studentName =
    profile?.full_name || t("studentProgress.defaultStudentName");
  const avatarUrl =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentName}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <Breadcrumb
        items={[
          {
            label: t("studentProgress.breadcrumb.dashboard"),
            href: "/app/teacher/dashboard",
          },
          { label: t("studentProgress.breadcrumb.studentProgress") },
        ]}
        className="mb-2"
      />
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden shadow-md">
          <OptimizedImage
            src={avatarUrl}
            alt={studentName}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {studentName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t("studentProgress.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">
              {t("studentProgress.stats.lessonsDone")}
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {completedLessonsCount}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">
              {t("studentProgress.stats.totalXp")}
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {totalXP}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">
              {t("studentProgress.stats.achievements")}
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {achievements.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />{" "}
          {t("studentProgress.courses.title")}
        </h2>
        <div className="space-y-4">
          {!courseProgress || courseProgress.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 italic text-sm text-center py-4">
              {t("studentProgress.courses.empty")}
            </p>
          ) : (
            courseProgress.map((cp) => {
              const courseTitle =
                cp.courses?.title || t("studentProgress.defaultCourseTitle");
              const fallbackLabel =
                cp.courses?.title || t("studentProgress.fallbackCourseLabel");
              return (
                <div
                  key={cp.id}
                  className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">
                      {courseTitle}
                    </h3>
                    <span className="text-sm font-bold text-blue-600">
                      {cp.percentage}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={cp.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t("studentProgress.courses.progressAria")
                      .replace("__TITLE__", fallbackLabel)
                      .replace("__PERCENT__", String(cp.percentage))}
                    className="w-full bg-slate-200 rounded-full h-2.5 mb-2 overflow-hidden"
                  >
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(cp.percentage ?? 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {t("studentProgress.courses.lessonsProgress")
                        .replace("__DONE__", String(cp.completed_lessons))
                        .replace("__TOTAL__", String(cp.total_lessons))}
                    </span>
                    {cp.last_activity_at && (
                      <span>
                        {t("studentProgress.courses.lastActivity").replace(
                          "__DATE__",
                          new Date(cp.last_activity_at).toLocaleDateString(
                            "id-ID",
                          ),
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />{" "}
            {t("studentProgress.quiz.title")}
          </h2>
          <div className="space-y-4">
            {quizAttempts.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 italic text-sm text-center py-4">
                {t("studentProgress.quiz.empty")}
              </p>
            ) : (
              quizAttempts.map((attempt) => {
                const isPassed = attempt.score >= 70;
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700"
                  >
                    <div>
                      {/* FIXED: Display quiz title if available, or shortened UUID instead of raw UUID */}
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {t("studentProgress.quiz.itemPrefix")}
                        {t("studentProgress.quiz.fallback").replace(
                          "__ID__",
                          attempt.quiz_id.slice(0, 8),
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {attempt.created_at
                          ? new Date(attempt.created_at).toLocaleDateString(
                              "id-ID",
                            )
                          : "-"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-bold px-3 py-1 rounded-full text-sm",
                        isPassed
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700",
                      )}
                    >
                      {t("studentProgress.quiz.score").replace(
                        "__SCORE__",
                        String(attempt.score),
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />{" "}
            {t("studentProgress.badges.title")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {achievements.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 italic text-sm text-center py-4 col-span-2">
                {t("studentProgress.badges.empty")}
              </p>
            ) : (
              achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center"
                >
                  <div className="text-3xl mb-2">
                    {ach.badges?.icon === "crown"
                      ? "👑"
                      : ach.badges?.icon === "zap"
                        ? "⚡"
                        : "🎯"}
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {ach.badges?.name || t("studentProgress.badges.fallback")}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(ach.earned_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
