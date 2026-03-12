import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle, Award, BookOpen, PlayCircle, ChevronRight, Layers, Clock, FileText, HelpCircle } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';
import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { courseService } from "@/src/services/courseService";
import { lessonService, type Lesson, type LessonProgress } from "@/src/services/lessonService";
import {
  VideoViewer,
  ArticleViewer,
  QuizViewer,
  AssignmentViewer,
  LessonSidebar,
  ProgressReporter,
  AITutorPanel,
  useViewerReducer,
} from "@/src/components/LessonViewer";
import { DiscussionBoard } from "@/src/components/Social/DiscussionBoard";
import { MessageSquare, Info, Sparkles } from "lucide-react";

// ============================================================
// Course/Module Browser — shown when no moduleId param
// ============================================================

interface CourseWithModules {
  id: string;
  title: string;
  description: string | null;
  modules: {
    id: string;
    title: string;
    order: number;
    lessonCount: number;
  }[];
}

function CourseBrowser({ onSelectModule, tenantId, courseId }: { onSelectModule: (moduleId: string) => void; tenantId: string; courseId?: string }) {
  const [courses, setCourses] = useState<CourseWithModules[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Fetch courses via service (already enforces tenant_id)
        const { courses: coursesData } = await courseService.fetchCourses({
          tenantId,
          limit: 100,
          ids: courseId ? [courseId] : undefined
        });

        if (!coursesData?.length) { setLoading(false); return; }

        // Fetch modules with lesson counts (filtered by tenant)
        const { data: modulesData } = await supabase
          .from('course_modules')
          .select('id, title, order, course_id, lessons(count)')
          .eq('tenant_id', tenantId)
          .in('course_id', coursesData.map(c => c.id))
          .order('order', { ascending: true });

        const courseMap: CourseWithModules[] = coursesData.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          modules: (modulesData || [])
            .filter(m => m.course_id === c.id)
            .map(m => ({
              id: m.id,
              title: m.title,
              order: m.order,
              lessonCount: (m as any).lessons?.[0]?.count ?? 0,
            })),
        }));

        setCourses(courseMap);
        if (courseMap.length === 1) setExpandedCourse(courseMap[0].id);
      } catch (err) {
        console.warn('[CourseBrowser] fetch failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const courseGradients = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-blue-600',
  ];

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

  if (!courses.length) {
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
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Smart Player</h1>
          </div>
          <p className="text-slate-500 ml-[52px]">Pilih modul untuk mulai belajar</p>
        </div>

        {/* Course Cards */}
        <div className="space-y-4">
          {courses.map((course, ci) => {
            const isExpanded = expandedCourse === course.id;
            const gradient = courseGradients[ci % courseGradients.length];

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.08, duration: 0.3 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Course Header */}
                <button
                  onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg",
                    gradient,
                    `shadow-${gradient.split('-')[1]}-500/20`
                  )}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-slate-400 truncate mt-0.5">{course.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {course.modules.length} modul
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {course.modules.reduce((sum, m) => sum + m.lessonCount, 0)} pelajaran
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-5 h-5 text-slate-300 shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )} />
                </button>

                {/* Module List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 bg-slate-50/50">
                        {course.modules.length === 0 ? (
                          <div className="p-5 text-center text-sm text-slate-400">
                            Belum ada modul dalam kursus ini.
                          </div>
                        ) : (
                          course.modules.map((mod, mi) => (
                            <motion.button
                              key={mod.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: mi * 0.04 }}
                              onClick={() => onSelectModule(mod.id)}
                              className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-blue-50/80 transition-all group border-b border-slate-100 last:border-b-0"
                            >
                              <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-slate-500 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-all shadow-sm">
                                {mod.order}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-700 group-hover:text-blue-700 truncate transition-colors text-sm">
                                  {mod.title}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {mod.lessonCount} pelajaran
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                            </motion.button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
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

  // Completion celebration
  const [showCelebration, setShowCelebration] = useState(false);

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
    if (!moduleId || !user?.id) return;
    setSidebarLoading(true);
    lessonService.fetchModuleLessons(moduleId, user.id)
      .then(({ lessons, progress }) => {
        setModuleLessons(lessons);
        setModuleProgress(progress);
      })
      .catch(err => console.error("Failed to load module lessons:", err))
      .finally(() => setSidebarLoading(false));
  }, [moduleId, user?.id]);

  // ============================================================
  // Load selected lesson (state machine: LOAD_LESSON)
  // ============================================================
  useEffect(() => {
    if (!lessonId || !user?.id) return;
    actions.loadLesson();

    Promise.all([
      lessonService.fetchLesson(lessonId),
      lessonService.fetchProgress(lessonId, user.id),
    ]).then(([lesson, progress]) => {
      if (lesson) {
        actions.lessonLoaded(lesson, progress);
      } else {
        actions.loadError("Pelajaran tidak ditemukan");
      }
    }).catch(err => {
      actions.loadError(err.message || "Gagal memuat pelajaran");
    });
  }, [lessonId, user?.id, actions]);

  // ============================================================
  // Handle lesson selection from sidebar
  // ============================================================
  const handleSelectLesson = useCallback((id: string) => {
    setSearchParams(prev => {
      prev.set("lessonId", id);
      return prev;
    });
    setActiveTab('content'); // Reset tab when switching lessons
  }, [setSearchParams]);

  // ============================================================
  // Completion handler (state machine: COMPLETION_MET → COMPLETED)
  // ============================================================
  const handleCompletionMet = useCallback(async () => {
    if (!state.lesson || !tenantId || state.status === 'completed') return;
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
  // Render: No module selected
  // ============================================================
  if (!moduleId) {
    return <CourseBrowser onSelectModule={handleSelectModule} tenantId={tenantId!} courseId={courseId} />;
  }

  // ============================================================
  // Render: Main Viewer Layout
  // ============================================================
  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-50/50 p-4 lg:p-8 gap-6 overflow-hidden">
      {/* Sidebar */}
      <LessonSidebar
        lessons={moduleLessons}
        progress={moduleProgress}
        activeLessonId={lessonId}
        onSelectLesson={handleSelectLesson}
        onBack={() => setSearchParams({})}
      />

      {/* Main Content Area - Floating Card */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative z-10">
        {/* Top Bar */}
        {/* Top Bar */}
        {state.lesson && (
          <div className="bg-white border-b border-slate-100 flex flex-col shrink-0">
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 text-sm text-blue-600 font-bold mb-2">
                  {state.lesson.type === 'video' ? <PlayCircle className="w-4 h-4" /> :
                    state.lesson.type === 'article' ? <FileText className="w-4 h-4" /> :
                      state.lesson.type === 'quiz' ? <HelpCircle className="w-4 h-4 text-purple-500" /> :
                        state.lesson.type === 'assignment' ? <FileText className="w-4 h-4 text-rose-500" /> :
                          <AlertTriangle className="w-4 h-4" />}
                  <span className="capitalize">{state.lesson.type}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 truncate tracking-tight">{state.lesson.title}</h1>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {state.status === 'completed' ? (
                  <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-green-200 bg-green-50 text-green-600 font-bold text-sm shadow-sm transition-all hover:bg-green-100">
                    <CheckCircle className="w-4 h-4" />
                    Selesai
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
            <div className="flex px-8 border-t border-slate-50" role="tablist" aria-label="Navigasi Pelajaran">
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
                        lessonService.fetchLesson(state.lesson.id),
                        user?.id ? lessonService.fetchProgress(state.lesson.id, user.id) : null,
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
              <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Pelajaran Selesai! 🎉</h2>
                <p className="text-slate-500">Progres Anda telah disimpan. Lanjutkan ke pelajaran berikutnya!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div >
    </div >
  );
}
