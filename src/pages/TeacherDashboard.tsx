import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/features/assignments/hooks/useAssignments";
import { useClassroom } from "@/features/classroom/hooks/useClassroomQueries";
import { DashboardSkeleton } from "@/features/dashboards/components/DashboardSkeleton";
import { TeacherOnboardingWizard } from "@/features/onboarding";
import { usePageTitle } from "@/hooks/usePageTitle";
import { navigationItems } from "@/shared/config/navigation";
import { cn } from "@/utils/cn";

export function TeacherDashboard() {
  const { t } = useTranslation();
  usePageTitle("Dasbor Guru");
  const {
    classrooms,
    setActiveClassroomId,
    loading: classroomsLoading,
  } = useClassroom();
  const { profile, tenantId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { assignments } = useAssignments();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ⚡ Perf: stabilize refresh handler ref
  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["analytics", tenantId] });
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [queryClient, tenantId]);

  // Real pending grading count from assignments
  const pendingGradingCount = useMemo(() => {
    let count = 0;
    for (const a of assignments) {
      if (a.studentSubmissions) {
        for (const sub of a.studentSubmissions) {
          if (sub.status === "submitted") {
            count++;
          }
        }
      }
    }
    return count;
  }, [assignments]);

  const alerts = useMemo(
    () =>
      pendingGradingCount > 0
        ? [
            {
              id: "grading",
              type: "grading" as const,
              message: `${pendingGradingCount} tugas perlu dikoreksi`,
              urgent: true,
            },
          ]
        : [],
    [pendingGradingCount],
  );

  const userName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || "Guru"
    : "Guru";

  // ⚡ Perf: memoize teaching tools filter
  const topTeachingTools = useMemo(
    () =>
      navigationItems
        .filter(
          (item) =>
            item.location === "teaching-hub" && item.roles.includes("teacher"),
        )
        .slice(0, 4),
    [],
  );

  // Render-time dedupe: classroomService already dedupes by id, but if a future
  // realtime path or upstream cache merge ever reintroduces dupes, this prevents
  // React's "Encountered two children with the same key" warning AND surfaces the
  // condition in dev so the operator can trace the source on the next sweep.
  const uniqueClassrooms = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof classrooms = [];
    let dupCount = 0;
    for (const c of classrooms) {
      if (seen.has(c.id)) {
        dupCount++;
        continue;
      }
      seen.add(c.id);
      out.push(c);
    }
    if (dupCount > 0 && import.meta.env.DEV) {
      console.warn(
        `[TeacherDashboard] Dropped ${dupCount} duplicate classroom row(s) before render. ` +
          `Investigate upstream source (classroomService.fetchClassrooms / realtime cache merge).`,
      );
    }
    return out;
  }, [classrooms]);

  // ⚡ Perf: stabilize navigate callback refs
  const navigateToCourses = useCallback(
    () => navigate("/app/teacher/courses"),
    [navigate],
  );
  const navigateToCreator = useCallback(() => navigate("/creator"), [navigate]);
  const navigateToTeachingHub = useCallback(
    () => navigate("/app/teacher/teaching-hub"),
    [navigate],
  );
  const navigateToClasses = useCallback(
    () => navigate("/app/teacher/classes"),
    [navigate],
  );

  if (classroomsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 pb-20 sm:pb-12 px-4 md:px-8 pt-8 dark:bg-slate-950 dark:text-slate-100 font-sans">
      {/* Header & Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800"
      >
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {userName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {pendingGradingCount > 0
              ? `${pendingGradingCount} tugas menanti koreksi`
              : "Semua tugas telah dikoreksi"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={
              <RefreshCw
                className={cn("w-4 h-4", isRefreshing && "animate-spin")}
              />
            }
            onClick={handleRefreshData}
            disabled={isRefreshing}
            aria-label="Perbarui Data"
            title="Perbarui Data"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<BookOpen className="w-4 h-4" />}
            onClick={navigateToCourses}
          >
            Materi
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={navigateToCreator}
          >
            Buat Tugas
          </Button>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-col gap-2"
        >
          {alerts.map((alert) => (
            <div
              key={alert.id}
              role="button"
              tabIndex={0}
              aria-label={alert.message}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  alert.type === "grading"
                    ? navigate("/grader")
                    : navigate("/analytics");
                }
              }}
              onClick={() =>
                alert.type === "grading"
                  ? navigate("/grader")
                  : navigate("/analytics")
              }
              className={cn(
                "group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                alert.urgent
                  ? "bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50 dark:border-orange-900/30 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    alert.urgent ? "bg-orange-500" : "bg-blue-500",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    alert.urgent
                      ? "text-orange-900 dark:text-orange-300"
                      : "text-blue-900 dark:text-blue-300",
                  )}
                >
                  {alert.message}
                </span>
              </div>
              <ChevronRight
                className={cn(
                  "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
                  alert.urgent ? "text-orange-400" : "text-blue-400",
                )}
              />
            </div>
          ))}
        </motion.div>
      )}

      {/* Class Overview (Table/List style) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Kelas Aktif
          </h2>
        </div>

        {uniqueClassrooms.length > 0 ? (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="font-medium px-4 py-3">Nama Kelas</th>
                    <th className="font-medium px-4 py-3">Siswa</th>
                    <th className="font-medium px-4 py-3">Status</th>
                    <th className="font-medium px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {uniqueClassrooms.map((classroom) => (
                    <tr
                      key={classroom.id}
                      className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {classroom.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {classroom.student_count ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Aktif
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setActiveClassroomId(classroom.id);
                              void navigate("/analytics");
                            }}
                            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Analitik"
                            aria-label="Analitik"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveClassroomId(classroom.id);
                              void navigate("/app/teacher/classes");
                            }}
                            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Kelola Kelas"
                            aria-label="Kelola Kelas"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center text-center">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Belum ada kelas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Buat kelas pertamamu untuk mulai mengajar.
            </p>
            <Button variant="secondary" size="sm" onClick={navigateToClasses}>
              Buat Kelas
            </Button>
          </div>
        )}
      </motion.div>

      {/* Teaching Tools */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Peralatan Mengajar
          </h2>
          <button
            onClick={navigateToTeachingHub}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            Lihat Semua <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {topTeachingTools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <div
                key={tool.id}
                role="button"
                tabIndex={0}
                aria-label={t(tool.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(tool.path);
                  }
                }}
                onClick={() => navigate(tool.path)}
                className="group p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-900/30 flex items-center gap-3"
              >
                <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {t(tool.name)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Aktivitas Terbaru
        </h2>
        <div className="py-8 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/10">
          <Clock className="w-5 h-5 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada aktivitas.
          </p>
        </div>
      </motion.div>

      <TeacherOnboardingWizard />
    </div>
  );
}
