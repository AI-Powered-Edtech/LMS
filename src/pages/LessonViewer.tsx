import { AlertTriangle, ArrowLeft, BookOpen, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { FeatureErrorBoundary } from '@/src/components/FeatureErrorBoundary'
import {
  AITutorPanel,
  LessonSidebar,
  MultiBlockViewer,
  ProgressReporter,
  ScrollProgressBar,
  useViewerReducer,
} from '@/src/components/LessonViewer'
import { DiscussionBoard } from '@/src/components/Social/DiscussionBoard'
import { useAuth } from '@/src/contexts/AuthContext'
import { LearningSessionProvider } from '@/src/features/analytics'
import { GuideRenderer } from '@/src/features/guidance'
import {
  isLessonLocked,
  type Lesson,
  type LessonProgress,
  lessonService,
} from '@/src/features/lessons'
import { CourseBrowser } from '@/src/features/lessons/components/CourseBrowser'
import { LessonEventTracker } from '@/src/features/lessons/components/LessonEventTracker'
import { StudentCoursesList } from '@/src/features/lessons/components/StudentCoursesList'
import {
  LegacyContentFallback,
  LessonBottomNav,
  LessonCelebrations,
  LessonTopBar,
} from '@/src/features/lessons/components/viewer'
import { StruggleHelpPrompt } from '@/src/features/struggle'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'
import { supabase } from '@/src/services/supabase/client'

// ============================================================
// LessonViewer Page — State Machine Architecture
// CourseBrowser → features/lessons/components/CourseBrowser.tsx
// LessonEventTracker → features/lessons/components/LessonEventTracker.tsx
// ============================================================

export function LessonViewer() {
  usePageTitle('Lesson Viewer')
  const { user, tenantId, role } = useAuth()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const { courseId } = useParams()
  const moduleId = searchParams.get('moduleId')
  const lessonId = searchParams.get('lessonId')

  const { state, actions } = useViewerReducer()

  // Analytics: session timing for LESSON_COMPLETED event
  const sessionStartRef = useRef(Date.now())
  useEffect(() => {
    sessionStartRef.current = Date.now()
  }, [lessonId])

  const isPreview = searchParams.get('preview') === 'true'
  const canPreview = isPreview && (role === 'teacher' || role === 'admin')
  useEffect(() => {
    if (isPreview && !canPreview) {
      setSearchParams((prev) => {
        prev.delete('preview')
        return prev
      })
    }
  }, [isPreview, canPreview, setSearchParams])

  // Sidebar data
  const [moduleLessons, setModuleLessons] = useState<Lesson[]>([])
  const [moduleProgress, setModuleProgress] = useState<Record<string, LessonProgress>>({})
  const [_sidebarLoading, setSidebarLoading] = useState(false)
  const [moduleTitle, setModuleTitle] = useState<string>('')

  // UI state
  const [showCelebration, setShowCelebration] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [showModuleComplete, setShowModuleComplete] = useState(false)
  const moduleCompleteShownRef = useRef<string | null>(null)
  const [lastQuizScore, _setLastQuizScore] = useState<number | null>(null)
  const [showXPReward, setShowXPReward] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'discussion' | 'ai_tutor'>('content')

  // Computed navigation state
  const currentLessonIndex = moduleLessons.findIndex((l) => l.id === lessonId)
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < moduleLessons.length - 1
      ? moduleLessons[currentLessonIndex + 1]
      : null
  const prevLesson = currentLessonIndex > 0 ? (moduleLessons[currentLessonIndex - 1] ?? null) : null
  const isLastLesson = currentLessonIndex >= 0 && currentLessonIndex === moduleLessons.length - 1
  const completedLessonCount = moduleLessons.filter((l) => moduleProgress[l.id]?.completed).length

  // ============================================================
  // Callbacks
  // ============================================================
  const handleSelectModule = useCallback(
    (id: string) => {
      setSearchParams({ moduleId: id })
    },
    [setSearchParams]
  )

  const handleSelectLesson = useCallback(
    (id: string) => {
      const index = moduleLessons.findIndex((l) => l.id === id)
      if (isLessonLocked(moduleLessons, moduleProgress, index, role)) return
      setSearchParams((prev) => {
        prev.set('lessonId', id)
        return prev
      })
      setActiveTab('content')
      setMobileSidebarOpen(false)
    },
    [setSearchParams, moduleLessons, moduleProgress, role]
  )

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleCompletionMet = useCallback(async () => {
    if (
      !state.lesson ||
      !tenantId ||
      state.status === 'completed' ||
      state.status === 'completing' ||
      state.status === 'loading'
    )
      return
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV)
        console.debug('[Lesson Completion]', { lessonId: state.lesson.id, status: state.status })
    }
    actions.completionMet()

    try {
      await lessonService.completeLesson(state.lesson.id, tenantId)
      actions.completed()

      setShowXPReward(true)
      setTimeout(() => setShowXPReward(false), 2000)

      if (user?.id) {
        setModuleProgress((prev) => ({
          ...prev,
          [state.lesson!.id]: {
            ...prev[state.lesson!.id],
            status: 'completed',
            progress_percentage: 100,
            completed: true,
          } as LessonProgress,
        }))
      }

      setShowCelebration(true)
      try {
        const confetti = (await import('canvas-confetti')).default
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } })
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Confetti failed:', err)
      }
      setTimeout(() => setShowCelebration(false), 4000)

      if (moduleId && moduleCompleteShownRef.current !== moduleId) {
        const updatedProgress = {
          ...moduleProgress,
          [state.lesson!.id]: { completed: true, status: 'completed' },
        }
        const allDone =
          moduleLessons.length > 0 &&
          moduleLessons.every(
            (l) => updatedProgress[l.id]?.completed || updatedProgress[l.id]?.status === 'completed'
          )
        if (allDone) {
          moduleCompleteShownRef.current = moduleId
          setTimeout(() => setShowModuleComplete(true), 4200)
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Completion failed:', err)
      addToast({ message: 'Gagal menandai selesai. Coba lagi.', type: 'error' })
    }
  }, [state.lesson, state.status, tenantId, user?.id, actions, addToast])
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleProgressUpdate = useCallback(
    (percentage: number, position?: number) => {
      actions.updateProgress(percentage, position)
    },
    [actions]
  )

  const handleResumeAnchorUpdate = useCallback(
    async (anchor: { lastBlockId: string; lastBlockIndex: number; lastBlockOffset: number }) => {
      if (!lessonId || !tenantId || !user?.id || state.status === 'completed') return
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
      )
    },
    [lessonId, tenantId, user?.id, state.progressPercentage, state.status]
  )

  const handleVideoTimeUpdate = useCallback(
    async (blockId: string, seconds: number) => {
      if (!lessonId || !tenantId || !user?.id || state.status === 'completed') return
      await lessonService.queueProgressUpdate(
        lessonId,
        tenantId,
        'in_progress',
        state.progressPercentage ?? 0,
        undefined,
        { lastBlockId: blockId, lastVideoPosition: seconds }
      )
    },
    [lessonId, tenantId, user?.id, state.progressPercentage, state.status]
  )

  const scrollToBlock = useCallback(
    (blockId?: string | null, blockIndex?: number | null, offset?: number | null) => {
      if (blockId) {
        const el = document.getElementById(`block-${blockId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          if (offset && offset > 0)
            setTimeout(() => window.scrollBy({ top: offset, behavior: 'smooth' }), 300)
          return
        }
      }
      if (blockIndex != null && blockIndex > 0) {
        const el = document.querySelectorAll('[data-block-id]')[blockIndex]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    },
    []
  )

  const handleStartOver = useCallback(() => {
    setShowResumeBanner(false)
  }, [])
  const handleResume = useCallback(() => {
    setShowResumeBanner(false)
    setTimeout(() => {
      scrollToBlock(
        state.progress?.last_block_id,
        state.progress?.last_block_index,
        state.progress?.last_block_offset
      )
    }, 100)
  }, [scrollToBlock, state.progress])

  // ============================================================
  // Effects
  // ============================================================

  // Load module lessons for sidebar
  useEffect(() => {
    if (!moduleId || !user?.id || !tenantId) return
    let cancelled = false
    setSidebarLoading(true)
    moduleCompleteShownRef.current = null

    supabase
      .from('course_modules')
      .select('title')
      .eq('id', moduleId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then(({ data: moduleData, error }) => {
        if (error) {
          if (import.meta.env.DEV) console.error('Failed to load module title:', error)
          return
        }
        if (!cancelled && moduleData?.title) setModuleTitle(moduleData.title)
      })

    lessonService
      .fetchModuleLessons(moduleId, user.id, tenantId)
      .then(({ lessons, progress }) => {
        if (!cancelled) {
          setModuleLessons(lessons)
          setModuleProgress(progress)
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Failed to load module lessons:', err)
      })
      .finally(() => {
        if (!cancelled) setSidebarLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [moduleId, user?.id, tenantId])

  // Load selected lesson (state machine: LOAD_LESSON)
  useEffect(() => {
    if (!lessonId || !user?.id || !tenantId) return
    let cancelled = false
    actions.loadLesson()

    Promise.all([
      lessonService.fetchLesson(lessonId, tenantId),
      lessonService.fetchProgress(lessonId, user.id, tenantId),
    ])
      .then(([lesson, progress]) => {
        if (cancelled) return
        if (lesson) actions.lessonLoaded(lesson, progress)
        else actions.loadError('Pelajaran tidak ditemukan')
      })
      .catch((err) => {
        if (!cancelled) actions.loadError(err.message || 'Gagal memuat pelajaran')
      })

    return () => {
      cancelled = true
    }
  }, [lessonId, user?.id, tenantId, actions])

  // Show resume banner when lesson loads with saved progress
  useEffect(() => {
    if (
      state.progress?.last_block_id &&
      state.status !== 'completed' &&
      state.status !== 'loading' &&
      state.status !== 'idle'
    ) {
      setShowResumeBanner(true)
    }
    if (state.status === 'completed') {
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
    }
  }, [state.progress, state.status])

  // ============================================================
  // Render: No module selected → CourseBrowser
  // ============================================================
  if (!courseId) {
    return <StudentCoursesList />
  }

  if (!moduleId) {
    return (
      <CourseBrowser onSelectModule={handleSelectModule} tenantId={tenantId!} courseId={courseId} />
    )
  }

  const totalBlocks = state.lesson?.lesson_resources?.length ?? 0
  const completedBlockCount =
    totalBlocks > 0 ? Math.round(((state.progressPercentage ?? 0) / 100) * totalBlocks) : 0

  // ============================================================
  // Render: Main Viewer Layout
  // ============================================================
  return (
    <LearningSessionProvider
      courseId={courseId}
      lessonId={lessonId ?? undefined}
      moduleId={moduleId ?? undefined}
    >
      <LessonEventTracker
        lessonStatus={state.status}
        hasResumeProgress={!!state.progress?.last_block_id}
        completedBlockCount={completedBlockCount}
        sessionStartRef={sessionStartRef}
      />
      <div className="flex flex-col lg:flex-row h-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4 lg:p-6 xl:p-8 gap-5 overflow-hidden">
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

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden relative z-10">
          {/* Top Bar */}
          {state.lesson && (
            <LessonTopBar
              lesson={state.lesson}
              moduleTitle={moduleTitle}
              moduleLessons={moduleLessons}
              currentLessonIndex={currentLessonIndex}
              completedLessonCount={completedLessonCount}
              status={state.status}
              progressPercentage={state.progressPercentage}
              courseId={courseId}
              lessonId={lessonId}
              prevLesson={prevLesson}
              nextLesson={nextLesson}
              isLastLesson={isLastLesson}
              activeTab={activeTab}
              onSelectLesson={handleSelectLesson}
              onCompletionMet={handleCompletionMet}
              onMobileSidebarOpen={() => setMobileSidebarOpen(true)}
              onTabChange={setActiveTab}
            />
          )}

          {/* Resume Banner */}
          {showResumeBanner && (
            <div className="mx-6 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Lanjutkan dari terakhir kamu berhenti?
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleStartOver}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
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
            <FeatureErrorBoundary featureName="Pelajaran">
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
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Memuat pelajaran...
                      </p>
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
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                        Gagal Memuat
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">{state.error}</p>
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
                {state.lesson &&
                  activeTab === 'content' &&
                  ['viewing', 'in_progress', 'completing', 'completed'].includes(state.status) && (
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
                      {role === 'student' && lessonId && <StruggleHelpPrompt lessonId={lessonId} />}
                      {role === 'student' && lessonId && (
                        <GuideRenderer targetType="lesson" targetId={lessonId} />
                      )}
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
                        <LegacyContentFallback
                          lesson={state.lesson}
                          status={state.status}
                          lastPosition={state.lastPosition}
                          lastQuizScore={lastQuizScore}
                          lessonId={lessonId}
                          onProgressUpdate={handleProgressUpdate}
                          onCompletionMet={handleCompletionMet}
                          onStartViewing={actions.startViewing}
                        />
                      )}
                    </motion.div>
                  )}

                {/* Discussion Tab */}
                {state.lesson && activeTab === 'discussion' && (
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
                        courseId={state.lesson.course_id}
                        lessonId={state.lesson.id}
                        isTeacher={role === 'teacher'}
                      />
                    </div>
                  </motion.div>
                )}

                {/* AI Tutor Tab */}
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
            </FeatureErrorBoundary>
          </div>

          {/* Bottom Navigation */}
          {state.lesson &&
            state.lesson.type !== 'quiz' &&
            (prevLesson || nextLesson) &&
            activeTab === 'content' && (
              <LessonBottomNav
                prevLesson={prevLesson}
                nextLesson={nextLesson}
                isLastLesson={isLastLesson}
                onSelectLesson={handleSelectLesson}
              />
            )}

          {/* Progress Reporter (invisible — syncs to Supabase every 5s) */}
          {state.lesson && tenantId && (
            <ProgressReporter
              lessonId={state.lesson.id}
              tenantId={tenantId}
              status={
                state.status === 'completed'
                  ? 'completed'
                  : state.status === 'in_progress'
                    ? 'in_progress'
                    : 'started'
              }
              progressPercentage={state.progressPercentage}
              lastPosition={state.lastPosition}
              enabled={['in_progress', 'viewing'].includes(state.status)}
            />
          )}

          {/* Celebrations & Modals */}
          <LessonCelebrations
            showXPReward={showXPReward}
            showCelebration={showCelebration}
            showModuleComplete={showModuleComplete}
            moduleTitle={moduleTitle}
            isLastLesson={isLastLesson}
            nextLesson={nextLesson}
            onSelectLesson={handleSelectLesson}
            onCelebrationDismiss={() => setShowCelebration(false)}
            onModuleContinue={() => {
              setShowModuleComplete(false)
              setSearchParams({})
            }}
            onModuleClose={() => setShowModuleComplete(false)}
          />
        </div>
      </div>
    </LearningSessionProvider>
  )
}
