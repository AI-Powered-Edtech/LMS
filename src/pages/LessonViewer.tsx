import { AlertTriangle, ArrowLeft, BookOpen, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { FeatureErrorBoundary } from '@/src/components/FeatureErrorBoundary'
import {
  LessonSidebar,
  MultiBlockViewer,
  ProgressReporter,
  ScrollProgressBar,
} from '@/src/components/LessonViewer'
import { DiscussionBoard } from '@/src/components/Social/DiscussionBoard'
import { AITutorPanel } from '@/src/features/ai-tutor/components/AITutorPanel'
import { LearningSessionProvider } from '@/src/features/analytics'
import { GuideRenderer } from '@/src/features/guidance'
import { CourseBrowser } from '@/src/features/lessons/components/CourseBrowser'
import { LessonEventTracker } from '@/src/features/lessons/components/LessonEventTracker'
import { StudentCoursesList } from '@/src/features/lessons/components/StudentCoursesList'
import {
  LegacyContentFallback,
  LessonBottomNav,
  LessonCelebrations,
  LessonTopBar,
} from '@/src/features/lessons/components/viewer'
import { useLessonViewerState } from '@/src/features/lessons/hooks/useLessonViewerState'
import { StruggleHelpPrompt } from '@/src/features/struggle'

// ============================================================
// LessonViewer Page -- Thin orchestrator
// ============================================================

export function LessonViewer() {
  const s = useLessonViewerState()

  // No course selected --> student courses list
  if (!s.courseId) {
    return <StudentCoursesList />
  }

  // No module selected --> course browser
  if (!s.moduleId) {
    if (!s.tenantId) {
      return <StudentCoursesList />
    }
    return (
      <CourseBrowser
        onSelectModule={s.handleSelectModule}
        tenantId={s.tenantId}
        courseId={s.courseId}
      />
    )
  }

  // ============================================================
  // Main Viewer Layout
  // ============================================================
  return (
    <LearningSessionProvider
      courseId={s.courseId}
      lessonId={s.lessonId ?? undefined}
      moduleId={s.moduleId ?? undefined}
    >
      <LessonEventTracker
        lessonStatus={s.state.status}
        hasResumeProgress={!!s.state.progress?.last_block_id}
        completedBlockCount={s.completedBlockCount}
        sessionStartRef={s.sessionStartRef}
      />
      <div className="flex flex-col lg:flex-row h-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4 lg:p-6 xl:p-8 gap-5 overflow-hidden">
        {/* Sidebar */}
        <LessonSidebar
          moduleTitle={s.moduleTitle}
          lessons={s.moduleLessons}
          progress={s.moduleProgress}
          activeLessonId={s.lessonId}
          onSelectLesson={s.handleSelectLesson}
          onBack={() => s.setSearchParams({})}
          isMobileOpen={s.mobileSidebarOpen}
          onMobileClose={() => s.setMobileSidebarOpen(false)}
          userRole={s.role}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden relative z-10">
          {/* Top Bar */}
          {s.state.lesson && (
            <LessonTopBar
              lesson={s.state.lesson}
              moduleTitle={s.moduleTitle}
              moduleLessons={s.moduleLessons}
              currentLessonIndex={s.currentLessonIndex}
              completedLessonCount={s.completedLessonCount}
              status={s.state.status}
              progressPercentage={s.state.progressPercentage}
              courseId={s.courseId}
              lessonId={s.lessonId}
              prevLesson={s.prevLesson}
              nextLesson={s.nextLesson}
              isLastLesson={s.isLastLesson}
              activeTab={s.activeTab}
              onSelectLesson={s.handleSelectLesson}
              onCompletionMet={s.handleCompletionMet}
              onMobileSidebarOpen={() => s.setMobileSidebarOpen(true)}
              onTabChange={s.setActiveTab}
            />
          )}

          {/* Resume Banner */}
          {s.showResumeBanner && (
            <div className="mx-6 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Lanjutkan dari terakhir kamu berhenti?
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={s.handleStartOver}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  Mulai dari awal
                </button>
                <button
                  onClick={s.handleResume}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <FeatureErrorBoundary featureName="Pelajaran">
              <AnimatePresence mode="wait">
                {/* Loading */}
                {s.state.status === 'loading' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Memuat pelajaran...
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Error */}
                {s.state.status === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <div className="text-center p-8">
                      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                        Gagal Memuat
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">{s.state.error}</p>
                      <button
                        onClick={s.actions.retry}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Idle -- no lesson selected */}
                {s.state.status === 'idle' && !s.lessonId && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center justify-center text-center p-8"
                  >
                    <div>
                      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ArrowLeft className="w-8 h-8 text-blue-400" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                        Pilih Pelajaran
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400">
                        Klik pelajaran di panel kiri untuk mulai belajar.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Lesson Content Tab */}
                {s.state.lesson &&
                  s.activeTab === 'content' &&
                  ['viewing', 'in_progress', 'completing', 'completed'].includes(
                    s.state.status
                  ) && (
                    <motion.div
                      key={s.state.lesson.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col overflow-auto"
                      role="tabpanel"
                      id="panel-content"
                      aria-labelledby="tab-content"
                    >
                      <ScrollProgressBar />
                      {s.role === 'student' && s.lessonId && (
                        <StruggleHelpPrompt lessonId={s.lessonId} />
                      )}
                      {s.role === 'student' && s.lessonId && (
                        <GuideRenderer targetType="lesson" targetId={s.lessonId} />
                      )}
                      {s.state.lesson.lesson_resources &&
                      s.state.lesson.lesson_resources.length > 0 ? (
                        <MultiBlockViewer
                          lesson={s.state.lesson}
                          isCompleted={s.state.status === 'completed'}
                          savedVideoBlockId={s.state.progress?.last_block_id ?? null}
                          savedVideoPosition={s.state.progress?.last_video_position ?? null}
                          onVideoTimeUpdate={s.handleVideoTimeUpdate}
                          onProgressUpdate={s.handleProgressUpdate}
                          onCompletionMet={s.handleCompletionMet}
                          onStartViewing={s.actions.startViewing}
                          onResumeAnchorUpdate={s.handleResumeAnchorUpdate}
                        />
                      ) : (
                        <LegacyContentFallback
                          lesson={s.state.lesson}
                          status={s.state.status}
                          lastPosition={s.state.lastPosition}
                          lastQuizScore={s.lastQuizScore}
                          lessonId={s.lessonId}
                          onProgressUpdate={s.handleProgressUpdate}
                          onCompletionMet={s.handleCompletionMet}
                          onStartViewing={s.actions.startViewing}
                        />
                      )}
                    </motion.div>
                  )}

                {/* Discussion Tab */}
                {s.state.lesson &&
                  s.activeTab === 'discussion' &&
                  ['viewing', 'in_progress', 'completing', 'completed'].includes(
                    s.state.status
                  ) && (
                    <motion.div
                      key="discussion-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1 p-8 overflow-auto bg-slate-50/50 dark:bg-slate-800/50"
                      role="tabpanel"
                      id="panel-discussion"
                      aria-labelledby="tab-discussion"
                    >
                      <div className="max-w-3xl mx-auto">
                        <DiscussionBoard
                          courseId={s.state.lesson.course_id}
                          lessonId={s.state.lesson.id}
                          isTeacher={s.role === 'teacher'}
                        />
                      </div>
                    </motion.div>
                  )}

                {/* AI Tutor Tab */}
                {s.state.lesson &&
                  s.activeTab === 'ai_tutor' &&
                  ['viewing', 'in_progress', 'completing', 'completed'].includes(
                    s.state.status
                  ) && (
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
                        lessonId={s.state.lesson.id}
                        lessonTitle={s.state.lesson.title}
                        courseId={s.state.lesson.course_id}
                      />
                    </motion.div>
                  )}
              </AnimatePresence>
            </FeatureErrorBoundary>
          </div>

          {/* Bottom Navigation */}
          {s.state.lesson &&
            s.state.lesson.type !== 'quiz' &&
            (s.prevLesson || s.nextLesson) &&
            s.activeTab === 'content' && (
              <LessonBottomNav
                prevLesson={s.prevLesson}
                nextLesson={s.nextLesson}
                isLastLesson={s.isLastLesson}
                onSelectLesson={s.handleSelectLesson}
              />
            )}

          {/* Progress Reporter (invisible -- syncs to Supabase every 5s) */}
          {s.state.lesson && s.tenantId && (
            <ProgressReporter
              lessonId={s.state.lesson.id}
              tenantId={s.tenantId}
              status={
                s.state.status === 'completed'
                  ? 'completed'
                  : s.state.status === 'in_progress'
                    ? 'in_progress'
                    : 'started'
              }
              progressPercentage={s.state.progressPercentage}
              lastPosition={s.state.lastPosition}
              enabled={['in_progress', 'viewing'].includes(s.state.status)}
            />
          )}

          {/* Celebrations & Modals */}
          <LessonCelebrations
            showXPReward={s.showXPReward}
            showCelebration={s.showCelebration}
            showModuleComplete={s.showModuleComplete}
            moduleTitle={s.moduleTitle}
            isLastLesson={s.isLastLesson}
            nextLesson={s.nextLesson}
            onSelectLesson={s.handleSelectLesson}
            onCelebrationDismiss={() => s.setShowCelebration(false)}
            onModuleContinue={() => {
              s.setShowModuleComplete(false)
              s.setSearchParams({})
            }}
            onModuleClose={() => s.setShowModuleComplete(false)}
          />
        </div>
      </div>
    </LearningSessionProvider>
  )
}
