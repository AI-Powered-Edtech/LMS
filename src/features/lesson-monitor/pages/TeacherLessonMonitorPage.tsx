import { Activity, BarChart3, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui";
import { useCourses } from "@/features/courses/queries/courseQueries";
import { usePageTitle } from "@/hooks/usePageTitle";

import { LessonTimeline } from "../components/LessonTimeline";
import { LiveProgressCard } from "../components/LiveProgressCard";
import { StudentActivityTable } from "../components/StudentActivityTable";
import { useActivityAlerts } from "../hooks/useActivityAlerts";
import { useLessonMonitorData } from "../queries/useLessonMonitor";

const LESSON_MONITOR_COURSE_STORAGE_KEY = "lesson-monitor:selected-course-id";

function readStoredCourseId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LESSON_MONITOR_COURSE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function TeacherLessonMonitorPage() {
  usePageTitle("Monitor Pelajaran");
  const [selectedCourseId, setSelectedCourseId] =
    useState<string>(readStoredCourseId);

  const { data: coursesData } = useCourses();
  const courses = coursesData?.courses ?? [];

  // Auto-select kursus pertama bila belum ada pilihan yang valid.
  // - Jika ada nilai di localStorage namun kursus tsb tidak lagi tersedia,
  //   fallback ke kursus pertama.
  useEffect(() => {
    if (courses.length === 0) return;
    const hasValidSelection =
      selectedCourseId && courses.some((c) => c.id === selectedCourseId);
    if (!hasValidSelection) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // Persist pilihan kursus ke localStorage agar tetap konsisten lintas sesi.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (selectedCourseId) {
        window.localStorage.setItem(
          LESSON_MONITOR_COURSE_STORAGE_KEY,
          selectedCourseId,
        );
      } else {
        window.localStorage.removeItem(LESSON_MONITOR_COURSE_STORAGE_KEY);
      }
    } catch {
      // Abaikan bila storage tidak dapat diakses (private mode dll).
    }
  }, [selectedCourseId]);
  const {
    data: monitorData,
    isLoading,
    error,
  } = useLessonMonitorData(selectedCourseId);
  // Memoize to keep a stable array reference; otherwise `|| []` creates a
  // fresh literal every render and causes useActivityAlerts to loop.
  const studentActivity = useMemo(
    () => monitorData?.studentActivity ?? [],
    [monitorData?.studentActivity],
  );
  const { highPriorityAlerts, mediumPriorityAlerts, dismissAlert } =
    useActivityAlerts(studentActivity);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
            Error memuat data monitor: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Monitor Pelajaran
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Pantau progress siswa secara real-time dan berikan bantuan tepat
            waktu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-sm font-bold">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            LIVE
          </div>
        </div>
      </div>

      {/* Course Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          Pilih Kursus
        </h3>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Pilih kursus untuk memantau...</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {!selectedCourseId ? (
        <EmptyState
          icon={<BarChart3 className="w-12 h-12" />}
          title="Pilih Kursus"
          description="Pilih kursus terlebih dahulu untuk melihat monitor pelajaran secara real-time."
        />
      ) : (
        <>
          {/* Summary Stats */}
          {monitorData?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {monitorData.summary.totalActiveStudents}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Siswa Aktif
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {monitorData.summary.totalLessonsInProgress}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Pelajaran Aktif
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {monitorData.summary.studentsNeedingHelp}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Perlu Bantuan
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {monitorData.summary.averageCompletionRate}%
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Completion Rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Alerts */}
          {(highPriorityAlerts.length > 0 ||
            mediumPriorityAlerts.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Pemberitahuan Siswa
              </h2>

              {highPriorityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-red-900 dark:text-red-100">
                          {alert.studentName}
                        </h4>
                        <p className="text-red-700 dark:text-red-300 text-sm">
                          {alert.message}
                        </p>
                        <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                          {alert.timestamp.toLocaleTimeString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <button
                      aria-label="Tutup"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {mediumPriorityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-yellow-900 dark:text-yellow-100">
                          {alert.studentName}
                        </h4>
                        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                          {alert.message}
                        </p>
                        <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                          {alert.timestamp.toLocaleTimeString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <button
                      aria-label="Tutup"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live Progress Cards */}
          {monitorData?.liveProgress && monitorData.liveProgress.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Progress Pelajaran Live
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {monitorData.liveProgress.map((progress) => (
                  <LiveProgressCard key={progress.lessonId} data={progress} />
                ))}
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Student Activity Table */}
            <div className="xl:col-span-2">
              <StudentActivityTable
                data={monitorData?.studentActivity || []}
                isLoading={isLoading}
              />
            </div>

            {/* Timeline */}
            <div>
              <LessonTimeline events={monitorData?.timeline || []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
