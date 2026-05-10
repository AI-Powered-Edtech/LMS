import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  CourseHeader,
  ModuleList,
  type ModuleWithProgress,
  ProgressSummary,
} from "@/components/CourseOverview";
import { Breadcrumb } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { LearningPathRecommendation } from "@/features/ai-recommendations";
import { courseService } from "@/features/courses";
import { lessonService } from "@/features/lessons/api/lessonService";
import { LessonSkeleton } from "@/features/lessons/components/LessonSkeleton";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { cn } from "@/utils/cn";
import { STALE } from "@/utils/queryConstants";

// ============================================================
// Types
// ============================================================

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
}

interface ModuleRow {
  id: string;
  title: string;
  order: number;
  lessons: Array<{
    id: string;
    title: string;
    type: string;
    order: number;
    duration_minutes?: number;
  }>;
}

// ============================================================
// Query Keys
// ============================================================

const base = createQueryKeys("course-browser");

const courseBrowserKeys = {
  courseData: (tenantId: string, courseId?: string) =>
    [...base.all(tenantId), "course-data", courseId ?? "all"] as const,
  modulesWithLessons: (courseId: string, tenantId: string) =>
    [...base.all(tenantId), "modules", courseId] as const,
  teacherName: (teacherId: string, tenantId: string) =>
    [...base.all(tenantId), "teacher-name", teacherId] as const,
  completedLessons: (userId: string, tenantId: string, lessonIds: string[]) =>
    [...base.all(tenantId), "completed", userId, lessonIds] as const,
};

// ============================================================
// Query Functions
// ============================================================

async function fetchCourseData(tenantId: string, courseId?: string) {
  const { courses: coursesData } = await courseService.fetchCourses({
    tenantId,
    limit: 100,
    ids: courseId ? [courseId] : undefined,
  });
  const published = (coursesData || []).filter((c) => c.status === "published");
  if (!published.length) return null;
  const active = published[0];
  return {
    id: active.id,
    title: active.title,
    description: active.description,
    created_by: active.created_by,
  } as CourseData;
}

async function fetchModulesWithLessons(courseId: string, tenantId: string) {
  return courseService.getCourseModulesWithLessons(
    courseId,
    tenantId,
  ) as unknown as ModuleRow[];
}

async function fetchTeacherName(teacherId: string, tenantId: string) {
  return courseService.getTeacherName(teacherId, tenantId);
}

// ============================================================
// CourseBrowser — shown when no moduleId param is selected
// ============================================================

export function CourseBrowser({
  onSelectModule,
  tenantId,
  courseId,
}: {
  onSelectModule: (moduleId: string) => void;
  tenantId: string;
  courseId?: string;
}) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  // Phase 1: Fetch course
  const courseQuery = useQuery({
    queryKey: courseBrowserKeys.courseData(tenantId, courseId),
    queryFn: () => fetchCourseData(tenantId, courseId),
    enabled: !!user?.id && !!tenantId,
    staleTime: STALE.MODERATE,
  });

  const course = courseQuery.data ?? null;

  // Phase 2: Fetch modules + instructor name (after course is loaded)
  const modulesQuery = useQuery({
    queryKey: courseBrowserKeys.modulesWithLessons(course?.id ?? "", tenantId),
    queryFn: () => fetchModulesWithLessons(course!.id, tenantId),
    enabled: !!course?.id,
    staleTime: STALE.MODERATE,
  });

  const teacherQuery = useQuery({
    queryKey: courseBrowserKeys.teacherName(course?.created_by ?? "", tenantId),
    queryFn: () => fetchTeacherName(course!.created_by, tenantId),
    enabled: !!course?.created_by,
    staleTime: STALE.MODERATE,
  });

  // Phase 3: Extract all lesson IDs from modules
  const allLessonIds = useMemo(() => {
    if (!modulesQuery.data) return [];
    return modulesQuery.data.flatMap((m) => (m.lessons || []).map((l) => l.id));
  }, [modulesQuery.data]);

  // Phase 4: Fetch completed lesson IDs
  const completedQuery = useQuery({
    queryKey: courseBrowserKeys.completedLessons(
      user?.id ?? "",
      tenantId,
      allLessonIds,
    ),
    queryFn: async () => {
      if (!user?.id || allLessonIds.length === 0) return new Set<string>();
      return lessonService.getCompletedLessonIds(user.id, allLessonIds);
    },
    enabled: !!user?.id && allLessonIds.length > 0,
    staleTime: STALE.MODERATE,
  });

  // Compute modules with progress
  const {
    modules,
    totalLessons,
    completedLessons,
    totalDuration,
    nextIncompleteModuleId,
  } = useMemo(() => {
    const modulesData = modulesQuery.data ?? [];
    const completedSet = completedQuery.data ?? new Set<string>();

    let totalL = 0;
    let completedL = 0;
    let totalDur = 0;
    let nextIncompleteId: string | undefined;

    const modulesWithProgress: ModuleWithProgress[] = modulesData.map((m) => {
      const lessons = m.lessons || [];
      const completedCount = lessons.filter((l) =>
        completedSet.has(l.id),
      ).length;
      const duration = lessons.reduce(
        (s, l) => s + (l.duration_minutes || 5),
        0,
      );
      totalL += lessons.length;
      completedL += completedCount;
      totalDur += duration;
      if (!nextIncompleteId && completedCount < lessons.length) {
        nextIncompleteId = m.id;
      }
      return {
        id: m.id,
        title: m.title,
        order: m.order,
        lessonCount: lessons.length,
        completedLessons: completedCount,
        durationMinutes: duration,
      };
    });

    return {
      modules: modulesWithProgress,
      totalLessons: totalL,
      completedLessons: completedL,
      totalDuration: totalDur,
      nextIncompleteModuleId: nextIncompleteId,
    };
  }, [modulesQuery.data, completedQuery.data]);

  const instructorName = teacherQuery.data ?? undefined;

  const handleContinueLearning = useCallback(() => {
    if (nextIncompleteModuleId) {
      onSelectModule(nextIncompleteModuleId);
    } else if (modules.length > 0) {
      onSelectModule(modules[0].id);
    }
  }, [nextIncompleteModuleId, modules, onSelectModule]);

  const handleRetryLoad = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "course-browser" &&
        query.queryKey[1] === tenantId,
    });

    await Promise.all([
      courseQuery.refetch(),
      modulesQuery.refetch(),
      teacherQuery.refetch(),
      completedQuery.refetch(),
    ]);
  }, [
    queryClient,
    tenantId,
    courseQuery,
    modulesQuery,
    teacherQuery,
    completedQuery,
  ]);

  const isLoading = courseQuery.isLoading || modulesQuery.isLoading;
  const fetchError =
    courseQuery.error ||
    modulesQuery.error ||
    teacherQuery.error ||
    completedQuery.error;

  if (isLoading) {
    return <LessonSkeleton />;
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center p-8 max-w-sm">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-10 h-10 text-red-400 dark:text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-100 mb-2">
            Gagal Memuat Materi
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-5">
            Gagal memuat materi. Periksa koneksi internet kamu dan coba lagi.
          </p>
          <button
            onClick={handleRetryLoad}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-100 mb-2">
            Belum Ada Materi
          </h2>
          <p className="text-slate-400 dark:text-slate-500">
            Kursus dan modul akan muncul di sini setelah guru membuatnya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-blue-900/10 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/app/student/dashboard" },
            { label: "Kursus", href: "/app/student/courses" },
            { label: course.title },
          ]}
          className="mb-2"
        />
        <CourseHeader
          course={course}
          instructorName={instructorName}
          onContinueLearning={handleContinueLearning}
          hasProgress={completedLessons > 0}
        />

        {totalLessons > 0 && (
          <ProgressSummary
            totalLessons={totalLessons}
            completedLessons={completedLessons}
            totalDurationMinutes={totalDuration}
          />
        )}

        {/* B7: Certificate Preview Motivator */}
        {totalLessons > 0 && (
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border",
              completedLessons === totalLessons
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800",
            )}
          >
            <span className="text-3xl shrink-0">
              {completedLessons === totalLessons ? "🎓" : "📚"}
            </span>
            <div className="flex-1">
              {completedLessons === totalLessons ? (
                <>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                    Sertifikat tersedia!
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Lihat dan unduh sertifikat kamu di halaman{" "}
                    <button
                      onClick={() => navigate("/app/student/certificates")}
                      className="font-bold underline"
                    >
                      Sertifikat
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">
                    Selesaikan course ini untuk mendapat Sertifikat!
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {totalLessons - completedLessons} pelajaran lagi menuju
                    sertifikatmu
                  </p>
                </>
              )}
            </div>
            {/* B8: XP Breakdown Preview */}
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Estimasi XP
              </p>
              <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500">
                ~{totalLessons * 10} XP
              </p>
            </div>
          </div>
        )}

        {modules.length > 0 ? (
          <ModuleList
            modules={modules}
            onSelectModule={onSelectModule}
            nextIncompleteModuleId={nextIncompleteModuleId}
          />
        ) : (
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800/80 rounded-2xl border border-indigo-100/70 dark:border-indigo-800/40 shadow-md shadow-slate-200/40 dark:shadow-none p-8 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-indigo-100/80 dark:bg-indigo-900/40 flex items-center justify-center">
              <BookOpen
                className="w-6 h-6 text-indigo-500 dark:text-indigo-300"
                aria-hidden="true"
              />
            </div>
            <p className="text-slate-700 dark:text-slate-200 text-sm font-semibold mb-1">
              {role === "teacher"
                ? "Kursus ini belum punya modul"
                : "Guru belum menambahkan materi"}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
              {role === "teacher"
                ? "Tambah minimal satu modul dan pelajaran terpublikasi sebelum kursus bisa diajukan untuk review."
                : "Kursus ini akan terbuka saat guru memublikasikan pelajaran pertama. Kamu bisa kembali lagi nanti — kami akan memberi tahu ketika materi tersedia."}
            </p>
          </div>
        )}

        {/* AI Learning Path Recommendations — only for students, non-blocking */}
        {role === "student" && courseId && (
          <LearningPathRecommendation
            courseId={courseId}
            tenantId={tenantId}
            onNavigateToLesson={(lessonId) => {
              setSearchParams({ lessonId });
            }}
          />
        )}
      </div>
    </div>
  );
}
