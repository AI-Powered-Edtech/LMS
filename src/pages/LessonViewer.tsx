import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle, Award, BookOpen, PlayCircle, ChevronRight, Layers, Clock, FileText, HelpCircle, Menu } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';
import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { courseService } from "@/src/features/courses";
import { lessonService, type Lesson, type LessonProgress, isLessonLocked } from "@/src/features/lessons";
import {
  VideoViewer,
  ArticleViewer,
  QuizViewer,
  AssignmentViewer,
  LessonSidebar,
  ProgressReporter,
  AITutorPanel,
  useViewerReducer,
  MultiBlockViewer,
  ScrollProgressBar,
  ModuleCompletionModal,
} from "@/src/components/LessonViewer";
import { DiscussionBoard } from "@/src/components/Social/DiscussionBoard";
import { MessageSquare, Info, Sparkles } from "lucide-react";
import { Breadcrumb } from "@/src/components/ui";
import { CourseHeader, ProgressSummary, ModuleList, type ModuleWithProgress } from "@/src/components/CourseOverview";

// ============================================================
// Course/Module Browser — shown when no moduleId param
// ============================================================

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
}

function CourseBrowser({ onSelectModule, tenantId, courseId }: { onSelectModule: (moduleId: string) => void; tenantId: string; courseId?: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<ModuleWithProgress[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [instructorName, setInstructorName] = useState<string | undefined>();
  const [nextIncompleteModuleId, setNextIncompleteModuleId] = useState<string | undefined>();

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        // 1. Fetch courses
        const { courses: coursesData } = await courseService.fetchCourses({
          tenantId,
          limit: 100,
          ids: courseId ? [courseId] : undefined,
        });

        if (!coursesData?.length) { setLoading(false); return; }

        // Use the first course (single-course view when courseId is present, or first available)
        const activeCourse = coursesData[0];
        setCourse({
          id: activeCourse.id,
          title: activeCourse.title,
          description: activeCourse.description,
          created_by: activeCourse.created_by,
        });

        // 2. Fetch modules with lesson details
        const { data: modulesData } = await supabase
          .from('course_modules')
          .select('id, title, order, course_id, lessons(id, duration_minutes)')
          .eq('tenant_id', tenantId)
          .eq('course_id', activeCourse.id)
          .order('order', { ascending: true });

        if (!modulesData?.length) {
          setModules([]);
          setLoading(false);
          return;
        }

        // 3. Collect all lesson IDs and fetch progress
        const allLessonIds = (modulesData as any[]).flatMap((m: any) =>
          (m.lessons || []).map((l: any) => l.id)
        );

        let completedSet = new Set<string>();
        if (allLessonIds.length > 0) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id, completed')
            .eq('user_id', user.id)
            .in('lesson_id', allLessonIds)
            .eq('completed', true);

          if (progressData) {
            completedSet = new Set(progressData.map(p => p.lesson_id));
          }
        }

        // 4. Build module progress data
        let totalL = 0;
        let completedL = 0;
        let totalDur = 0;
        let foundNextIncomplete = false;

        const modulesWithProgress: ModuleWithProgress[] = (modulesData as any[]).map((m: any) => {
          const lessons = m.lessons || [];
          const lessonCount = lessons.length;
          const completedCount = lessons.filter((l: any) => completedSet.has(l.id)).length;
          const duration = lessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 5), 0);

          totalL += lessonCount;
          completedL += completedCount;
          totalDur += duration;

          // Find the first incomplete module for "Lanjut Belajar"
          if (!foundNextIncomplete && completedCount < lessonCount) {
            setNextIncompleteModuleId(m.id);
            foundNextIncomplete = true;
          }

          return {
            id: m.id,
            title: m.title,
            order: m.order,
            lessonCount,
            completedLessons: completedCount,
            durationMinutes: duration,
          };
        });

        setModules(modulesWithProgress);
        setTotalLessons(totalL);
        setCompletedLessons(completedL);
        setTotalDuration(totalDur);

        // 5. Fetch instructor name from profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', activeCourse.created_by)
          .single();

        if (profileData?.full_name) {
          setInstructorName(profileData.full_name);
        }
      } catch (err) {
        console.warn('[CourseBrowser] fetch failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, courseId, user?.id]);

  const handleContinueLearning = useCallback(() => {
    if (nextIncompleteModuleId) {
      onSelectModule(nextIncompleteModuleId);
    } else if (modules.length > 0) {
      // All complete or no progress — go to first module
      onSelectModule(modules[0].id);
    }
  }, [nextIncompleteModuleId, modules, onSelectModule]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Memuat materi...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Belum Ada Materi</h2>
          <p className="text-slate-400">Kursus dan modul akan muncul di sini setelah guru membuatnya.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
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

        {modules.length > 0 ? (
          <ModuleList
            modules={modules}
            onSelectModule={onSelectModule}
            nextIncompleteModuleId={nextIncompleteModuleId}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-md shadow-slate-200/40 p-8 text-center">
            <p className="text-slate-400 text-sm">Belum ada modul dalam kursus ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LessonViewer Page — State Machine Architecture
// ============================================================

export function LessonViewer() {
  const { user, tenantId, profile, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { courseId } = useParams();
  const moduleId = searchParams.get("moduleId");
  const lessonId = searchParams.get("lessonId");

  // State machine
  const { state, actions } = useViewerReducer();

  const isPreview = searchParams.get("preview") === "true";
  const canPreview = isPreview && (role === 'teacher' || role === 'admin');

  // If trying to preview but unauthorized, redirect to normal view
  useEffect(() => {
    if (isPreview && !canPreview) {
      setSearchParams(prev => {
        prev.delete("preview");
        return prev;
      });
    }
  }, [isPreview, canPreview, setSearchParams]);

  // Sidebar data
  const [moduleLessons, setModuleLessons] = useState<Lesson[]>([]);
  const [moduleProgress, setModuleProgress] = useState<Record<string, LessonProgress>>({});
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [moduleTitle, setModuleTitle] = useState<string>('');

  // Completion celebration
  const [showCelebration, setShowCelebration] = useState(false);

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Resume banner state
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Module completion celebration
  const [showModuleComplete, setShowModuleComplete] = useState(false);
  const moduleCompleteShownRef = useRef<string | null>(null);

  // ============================================================
  // D1: Compute lesson navigation state
  // ============================================================
  const currentLessonIndex = moduleLessons.findIndex(l => l.id === lessonId);
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < moduleLessons.length - 1 
    ? moduleLessons[currentLessonIndex + 1] 
    : null;
  const isLastLesson = currentLessonIndex >= 0 && currentLessonIndex === moduleLessons.length - 1;
  const completedLessonCount = moduleLessons.filter(l => moduleProgress[l.id]?.completed).length;

  // Tabs state
  const [activeTab, setActiveTab] = useState<'content' | 'discussion' | 'ai_tutor'>('content');

  // ============================================================
  // Handle module selection from CourseBrowser
  // ============================================================
  const handleSelectModule = useCallback((id: string) => {
    setSearchParams({ moduleId: id });
  }, [setSearchParams]);

  // ============================================================
  // Load module lessons for sidebar
  // ============================================================
  useEffect(() => {
    if (!moduleId || !user?.id || !tenantId) return;
    let cancelled = false;
    setSidebarLoading(true);
    moduleCompleteShownRef.current = null; // Reset on module change

    // Fetch module title
    supabase
      .from('course_modules')
      .select('title')
      .eq('id', moduleId)
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data: moduleData, error }) => {
        if (error) { console.error("Failed to load module title:", error); return; }
        if (!cancelled && moduleData?.title) {
          setModuleTitle(moduleData.title);
        }
      });

    lessonService.fetchModuleLessons(moduleId, user.id, tenantId)
      .then(({ lessons, progress }) => {
        if (!cancelled) {
          setModuleLessons(lessons);
          setModuleProgress(progress);
        }
      })
      .catch(err => console.error("Failed to load module lessons:", err))
      .finally(() => { if (!cancelled) setSidebarLoading(false); });

    return () => { cancelled = true; };
  }, [moduleId, user?.id, tenantId]);

  // ============================================================
  // Load selected lesson (state machine: LOAD_LESSON)
  // ============================================================
  useEffect(() => {
    if (!lessonId || !user?.id || !tenantId) return;
    actions.loadLesson();

    Promise.all([
      lessonService.fetchLesson(lessonId, tenantId),
      lessonService.fetchProgress(lessonId, user.id, tenantId),
    ]).then(([lesson, progress]) => {
      if (lesson) {
        actions.lessonLoaded(lesson, progress);
      } else {
        actions.loadError("Pelajaran tidak ditemukan");
      }
    }).catch(err => {
      actions.loadError(err.message || "Gagal memuat pelajaran");
    });
  }, [lessonId, user?.id, tenantId, actions]);

  // ============================================================
  // Handle lesson selection from sidebar
  // ============================================================
  const handleSelectLesson = useCallback((id: string) => {
    // Find the index of the selected lesson
    const index = moduleLessons.findIndex(l => l.id === id);
    
    // Check if the lesson is locked
    if (isLessonLocked(moduleLessons, moduleProgress, index, role)) {
      return; // Do nothing if locked
    }
    
    setSearchParams(prev => {
      prev.set("lessonId", id);
      return prev;
    });
    setActiveTab('content'); // Reset tab when switching lessons
    setMobileSidebarOpen(false); // Close mobile drawer when lesson is selected
  }, [setSearchParams, moduleLessons, moduleProgress, role]);

  // ============================================================
  // Completion handler (state machine: COMPLETION_MET → COMPLETED)
  // ============================================================
  const handleCompletionMet = useCallback(async () => {
    if (!state.lesson || !tenantId || state.status === 'completed') return;
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Lesson Completion]', { lessonId: state.lesson.id, status: state.status });
    }
    actions.completionMet();

    try {
      await lessonService.completeLesson(state.lesson.id, tenantId);
      actions.completed();

      // Update sidebar progress
      if (user?.id) {
        setModuleProgress(prev => ({
          ...prev,
          [state.lesson!.id]: {
            ...prev[state.lesson!.id],
            status: 'completed',
            progress_percentage: 100,
            completed: true,
          } as LessonProgress,
        }));
      }

      // Celebration
      setShowCelebration(true);
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } });
      } catch (err) { console.warn("Confetti failed:", err); }
      setTimeout(() => setShowCelebration(false), 4000);

      // Check module completion (all lessons in module done?)
      if (moduleId && moduleCompleteShownRef.current !== moduleId) {
        const updatedProgress = { ...moduleProgress, [state.lesson!.id]: { completed: true, status: 'completed' } };
        const allDone = moduleLessons.length > 0 && moduleLessons.every(l => updatedProgress[l.id]?.completed || updatedProgress[l.id]?.status === 'completed');
        if (allDone) {
          moduleCompleteShownRef.current = moduleId;
          setTimeout(() => setShowModuleComplete(true), 4200); // after lesson celebration fades
        }
      }
    } catch (err) {
      console.error("Completion failed:", err);
    }
  }, [state.lesson, state.status, tenantId, user?.id, actions]);

  // ============================================================
  // Progress update handler
  // ============================================================
  const handleProgressUpdate = useCallback((percentage: number, position?: number) => {
    actions.updateProgress(percentage, position);
  }, [actions]);

  // ============================================================
  // Resume anchor update handler (debounced from MultiBlockViewer)
  // ============================================================
  const handleResumeAnchorUpdate = useCallback(async (anchor: {
    lastBlockId: string;
    lastBlockIndex: number;
    lastBlockOffset: number;
  }) => {
    if (!lessonId || !tenantId || !user?.id || state.status === 'completed') return;

    await lessonService.queueProgressUpdate(
      lessonId,
      tenantId,
      'in_progress',
      state.progressPercentage ?? 0,
      undefined,
      {
        lastBlockId: anchor.lastBlockId,
        lastBlockIndex: anchor.lastBlockIndex,
        lastBlockOffset: anchor.lastBlockOffset,
      }
    );
  }, [lessonId, tenantId, user?.id, state.progressPercentage, state.status]);

  // ============================================================
  // Video time update handler (debounced from VideoBlock)
  // ============================================================
  const handleVideoTimeUpdate = useCallback(async (blockId: string, seconds: number) => {
    if (!lessonId || !tenantId || !user?.id || state.status === 'completed') return;

    await lessonService.queueProgressUpdate(
      lessonId,
      tenantId,
      'in_progress',
      state.progressPercentage ?? 0,
      undefined,
      { lastBlockId: blockId, lastVideoPosition: seconds }
    );
  }, [lessonId, tenantId, user?.id, state.progressPercentage, state.status]);

  // ============================================================
  // Scroll to block helper function
  // ============================================================
  const scrollToBlock = useCallback((
    blockId?: string | null,
    blockIndex?: number | null,
    offset?: number | null,
  ) => {
    // 1. Try by block id
    if (blockId) {
      const el = document.getElementById(`block-${blockId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (offset && offset > 0) {
          setTimeout(() => window.scrollBy({ top: offset, behavior: 'smooth' }), 300);
        }
        return;
      }
    }
    // 2. Fallback to block index
    if (blockIndex != null && blockIndex > 0) {
      const blocks = document.querySelectorAll('[data-block-id]');
      const el = blocks[blockIndex];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    // 3. Fallback: top
  }, []);

  // ============================================================
  // Resume banner handlers
  // ============================================================
  const handleStartOver = useCallback(() => {
    setShowResumeBanner(false);
    // Stay at top - no action needed
  }, []);

  const handleResume = useCallback(() => {
    setShowResumeBanner(false);
    // Scroll must happen AFTER blocks are mounted in the DOM
    setTimeout(() => {
      scrollToBlock(
        state.progress?.last_block_id,
        state.progress?.last_block_index,
        state.progress?.last_block_offset
      );
    }, 100);
  }, [scrollToBlock, state.progress]);

  // ============================================================
  // Show resume banner when lesson loads with saved progress
  // ============================================================
  useEffect(() => {
    // Only show banner when lesson is loaded and not completed
    if (
      state.progress &&
      state.progress.last_block_id &&
      state.status !== 'completed' &&
      state.status !== 'loading' &&
      state.status !== 'idle'
    ) {
      setShowResumeBanner(true);
    }
    // For completed lessons, silently scroll to top
    if (state.status === 'completed') {
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  }, [state.progress, state.status]);

  // ============================================================
  // Render: No module selected
  // ============================================================
  if (!moduleId) {
    return <CourseBrowser onSelectModule={handleSelectModule} tenantId={tenantId!} courseId={courseId} />;
  }

  // ============================================================
  // Render: Main Viewer Layout
  // ============================================================
  return (
    <div className="flex flex-col lg:flex-row h-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 p-4 lg:p-6 xl:p-8 gap-5 overflow-hidden">
      {/* Sidebar */}
      <LessonSidebar
        moduleTitle={moduleTitle}
        lessons={moduleLessons}
        progress={moduleProgress}
        activeLessonId={lessonId}
        onSelectLesson={handleSelectLesson}
        onBack={() => setSearchParams({})}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        userRole={role}
      />

      {/* Main Content Area - Floating Card */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-200/70 shadow-lg shadow-slate-200/50 overflow-hidden relative z-10">
        {/* Top Bar */}
        {state.lesson && (
          <div className="bg-gradient-to-r from-white to-slate-50/50 border-b border-slate-100 flex flex-col shrink-0 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-3">
                  {/* Mobile hamburger button */}
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    aria-label="Buka daftar pelajaran"
                    className="lg:hidden shrink-0 p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </button>
                  <Breadcrumb
                    items={[
                      { label: 'Materi', href: '/lesson' },
                      { label: moduleTitle || 'Modul' },
                      { label: state.lesson.title },
                    ]}
                  />
                </div>
                {moduleLessons.length > 0 && currentLessonIndex >= 0 && (
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-slate-500">
                      Pelajaran {currentLessonIndex + 1} / {moduleLessons.length}
                    </span>
                    <div 
                      className="flex-1 max-w-[200px] h-1.5 bg-slate-200 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={completedLessonCount}
                      aria-valuemin={0}
                      aria-valuemax={moduleLessons.length}
                    >
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(completedLessonCount / moduleLessons.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {completedLessonCount}/{moduleLessons.length} selesai
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-blue-600 font-bold mb-2">
                  {state.lesson.type === 'video' ? <PlayCircle className="w-4 h-4" /> :
                    state.lesson.type === 'article' ? <FileText className="w-4 h-4" /> :
                      state.lesson.type === 'quiz' ? <HelpCircle className="w-4 h-4 text-purple-500" /> :
                        state.lesson.type === 'assignment' ? <FileText className="w-4 h-4 text-rose-500" /> :
                          <AlertTriangle className="w-4 h-4" />}
                  <span className="capitalize">{state.lesson.type}</span>
                </div>
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 truncate tracking-tight leading-tight">{state.lesson.title}</h1>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {state.status === 'completed' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-green-200 bg-green-50 text-green-600 font-bold text-sm shadow-sm transition-all hover:bg-green-100">
                      <CheckCircle className="w-4 h-4" />
                      Selesai
                    </div>
                    {nextLesson ? (
                      <button
                        onClick={() => handleSelectLesson(nextLesson.id)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all"
                      >
                        Berikutnya
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : isLastLesson ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 font-bold text-sm shadow-sm">
                        <Award className="w-4 h-4" />
                        Modul Selesai!
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    onClick={state.lesson.type !== 'video' ? handleCompletionMet : undefined}
                    disabled={state.status === 'loading' || (state.lesson.type === 'video' && state.progressPercentage < 95)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm shadow-sm border transition-all",
                      state.progressPercentage >= 95 || state.lesson.type !== 'video'
                        ? "border-green-600 text-green-600 hover:bg-green-50"
                        : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed hidden"
                    )}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Tandai Selesai
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-8 gap-1" role="tablist" aria-label="Navigasi Pelajaran">
              <button
                role="tab"
                id="tab-content"
                aria-selected={activeTab === 'content'}
                aria-controls="panel-content"
                onClick={() => setActiveTab('content')}
                className={cn(
                  "px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2",
                  activeTab === 'content' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Info className="w-4 h-4" />
                Materi
              </button>
              <button
                role="tab"
                id="tab-discussion"
                aria-selected={activeTab === 'discussion'}
                aria-controls="panel-discussion"
                onClick={() => setActiveTab('discussion')}
                className={cn(
                  "px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2",
                  activeTab === 'discussion' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Diskusi
              </button>
              <button
                role="tab"
                id="tab-ai-tutor"
                aria-selected={activeTab === 'ai_tutor'}
                aria-controls="panel-ai-tutor"
                onClick={() => setActiveTab('ai_tutor')}
                className={cn(
                  "px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2",
                  activeTab === 'ai_tutor' ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Tutor AI
              </button>
            </div>
          </div>
        )}

        {/* Resume Banner */}
        {showResumeBanner && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-sm font-medium text-blue-800">
                Lanjutkan dari terakhir kamu berhenti?
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleStartOver}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Mulai dari awal
              </button>
              <button
                onClick={handleResume}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              {/* Loading */}
              {state.status === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Memuat pelajaran...</p>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {state.status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <div className="text-center p-8">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Gagal Memuat</h2>
                    <p className="text-slate-500 mb-4">{state.error}</p>
                    <button
                      onClick={actions.retry}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Idle — no lesson selected */}
              {state.status === 'idle' && !lessonId && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center text-center p-8"
                >
                  <div>
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <ArrowLeft className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Pilih Pelajaran</h2>
                    <p className="text-slate-500">Klik pelajaran di panel kiri untuk mulai belajar.</p>
                  </div>
                </motion.div>
              )}

              {/* Lesson Content Tab */}
              {state.lesson && activeTab === 'content' && ['viewing', 'in_progress', 'completing', 'completed'].includes(state.status) && (
                <motion.div
                  key={state.lesson.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col overflow-auto"
                  role="tabpanel"
                  id="panel-content"
                  aria-labelledby="tab-content"
                >
                  <ScrollProgressBar />
                  {/* Multi-Block Lesson Renderer */}
                  {state.lesson.lesson_resources && state.lesson.lesson_resources.length > 0 ? (
                    <MultiBlockViewer
                      lesson={state.lesson}
                      isCompleted={state.status === 'completed'}
                      savedVideoBlockId={state.progress?.last_block_id ?? null}
                      savedVideoPosition={state.progress?.last_video_position ?? null}
                      onVideoTimeUpdate={handleVideoTimeUpdate}
                      onProgressUpdate={handleProgressUpdate}
                      onCompletionMet={handleCompletionMet}
                      onStartViewing={actions.startViewing}
                      onResumeAnchorUpdate={handleResumeAnchorUpdate}
                    />
                  ) : (
                    /* Fallback for legacy lessons with no blocks (video-only, article-only) */
                    <>
                      {/* Video Lesson */}
                      {state.lesson.type === 'video' && (() => {
                        const videoResource = state.lesson!.lesson_resources?.find(r => r.type === 'VIDEO');
                        const videoUrl = videoResource?.url || videoResource?.content || '';

                        const handleSeedDummyVideo = async () => {
                          if (!tenantId || !state.lesson) return;
                          // Safe dynamic import so production bundles aren't impacted
                          const { DEV_SEED_VIDEO } = await import('@/src/config/devSeeds');
                          await lessonService.seedDummyVideo(state.lesson.id, tenantId, DEV_SEED_VIDEO);

                          // Reload lesson
                          actions.loadLesson();
                          const [lesson, progress] = await Promise.all([
                            lessonService.fetchLesson(state.lesson.id, tenantId),
                            user?.id ? lessonService.fetchProgress(state.lesson.id, user.id, tenantId) : null,
                          ]);
                          if (lesson) {
                            actions.lessonLoaded(lesson, progress || null);
                          }
                        };

                        return (
                          <VideoViewer
                            videoUrl={videoUrl}
                            savedPosition={state.lastPosition}
                            isCompleted={state.status === 'completed'}
                            onProgressUpdate={handleProgressUpdate}
                            onCompletionMet={handleCompletionMet}
                            onStartViewing={actions.startViewing}
                            onSeedDummyVideo={handleSeedDummyVideo}
                          />
                        );
                      })()}

                      {/* Article Lesson */}
                      {state.lesson.type === 'article' && (() => {
                        const articleResource = state.lesson!.lesson_resources?.find(r =>
                          r.type === 'DOCUMENT' || r.type === 'LINK'
                        );
                        const content = articleResource?.content || state.lesson!.content || 'Konten belum tersedia.';
                        const minReadTime = (state.lesson!.duration_minutes || 2) * 60;
                        return (
                          <ArticleViewer
                            content={content}
                            minReadingTimeSeconds={minReadTime}
                            isCompleted={state.status === 'completed'}
                            onProgressUpdate={handleProgressUpdate}
                            onCompletionMet={handleCompletionMet}
                            onStartViewing={actions.startViewing}
                          />
                        );
                      })()}

                      {/* Quiz Lesson */}
                      {state.lesson.type === 'quiz' && (() => {
                        const quiz = state.lesson!.quizzes?.[0];
                        if (!quiz) {
                          return (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                              Kuis belum tersedia untuk pelajaran ini.
                            </div>
                          );
                        }
                        return (
                          <QuizViewer
                            quizId={quiz.id}
                            title={quiz.title}
                            instructions={quiz.instructions}
                            questions={quiz.quiz_questions}
                            maxAttempts={quiz.max_attempts}
                            isCompleted={state.status === 'completed'}
                            onCompletionMet={handleCompletionMet}
                            onStartViewing={actions.startViewing}
                          />
                        );
                      })()}

                      {/* Assignment Lesson */}
                      {state.lesson.type === 'assignment' && (() => {
                        const assignment = state.lesson!.assignments?.[0];
                        if (!assignment) {
                          return (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                              Tugas belum tersedia untuk pelajaran ini.
                            </div>
                          );
                        }
                        return (
                          <AssignmentViewer
                            assignmentId={assignment.id}
                            title={assignment.title}
                            instructions={assignment.instructions}
                            maxPoints={assignment.max_points}
                            maxAttempts={assignment.max_attempts}
                            isPublished={assignment.is_published}
                            dueDate={assignment.due_date}
                            isCompleted={state.status === 'completed'}
                            onCompletionMet={handleCompletionMet}
                            onStartViewing={actions.startViewing}
                          />
                        );
                      })()}
                    </>
                  )}
                </motion.div>
              )}

              {/* Discussion Tab Content */}
              {state.lesson && activeTab === 'discussion' && (
                <motion.div
                  key="discussion-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 p-8 overflow-auto bg-slate-50/50"
                  role="tabpanel"
                  id="panel-discussion"
                  aria-labelledby="tab-discussion"
                >
                  <div className="max-w-3xl mx-auto">
                    <DiscussionBoard
                      courseId={state.lesson.course_id}
                      lessonId={state.lesson.id}
                      isTeacher={role === 'teacher'}
                    />
                  </div>
                </motion.div>
              )}

              {/* AI Tutor Tab Content */}
              {state.lesson && activeTab === 'ai_tutor' && (
                <motion.div
                  key="ai-tutor-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 overflow-hidden"
                  role="tabpanel"
                  id="panel-ai-tutor"
                  aria-labelledby="tab-ai-tutor"
                >
                  <AITutorPanel
                    lessonId={state.lesson.id}
                    lessonTitle={state.lesson.title}
                    courseId={state.lesson.course_id}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </ErrorBoundary>
        </div>

        {/* Progress Reporter (invisible — syncs to Supabase every 5s) */}
        {
          state.lesson && tenantId && (
            <ProgressReporter
              lessonId={state.lesson.id}
              tenantId={tenantId}
              status={state.status === 'completed' ? 'completed' : state.status === 'in_progress' ? 'in_progress' : 'started'}
              progressPercentage={state.progressPercentage}
              lastPosition={state.lastPosition}
              enabled={['in_progress', 'viewing'].includes(state.status)}
            />
          )
        }

        {/* Completion Celebration Overlay */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm pointer-events-auto">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Pelajaran Selesai! 🎉</h2>
                {nextLesson ? (
                  <button
                    onClick={() => {
                      handleSelectLesson(nextLesson.id);
                      setShowCelebration(false);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-lg"
                  >
                    Lanjut ke Pelajaran Berikutnya →
                  </button>
                ) : isLastLesson ? (
                  <p className="text-slate-500">Semua pelajaran di modul ini telah selesai!</p>
                ) : (
                  <p className="text-slate-500">Progres Anda telah disimpan.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Module Completion Modal */}
        <AnimatePresence>
          {showModuleComplete && (
            <ModuleCompletionModal
              moduleTitle={moduleTitle}
              hasNextModule={!isLastLesson}
              onContinue={() => {
                setShowModuleComplete(false);
                setSearchParams({});
              }}
              onClose={() => setShowModuleComplete(false)}
            />
          )}
        </AnimatePresence>
      </div >
    </div >
  );
}
