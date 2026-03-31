import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { useViewerReducer } from '@/src/components/LessonViewer'
import { useAuth } from '@/src/contexts/AuthContext'
import {
  isLessonLocked,
  type Lesson,
  type LessonProgress,
  lessonService,
} from '@/src/features/lessons'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'
import { captureError } from '@/src/utils/sentry'

export function useLessonViewerState() {
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

  // Refs to avoid stale closures in handleCompletionMet
  const moduleProgressRef = useRef<Record<string, LessonProgress>>({})
  moduleProgressRef.current = moduleProgress

  const moduleLessonsRef = useRef<Lesson[]>([])
  moduleLessonsRef.current = moduleLessons

  // UI state
  const [showCelebration, setShowCelebration] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [showModuleComplete, setShowModuleComplete] = useState(false)
  const moduleCompleteShownRef = useRef<string | null>(null)
  const [lastQuizScore, _setLastQuizScore] = useState<number | null>(null)
  const [showXPReward, setShowXPReward] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'discussion' | 'ai_tutor'>('content')

  // Throttle ref for handleVideoTimeUpdate (Fix H-11)
  const lastVideoUpdateRef = useRef(0)

  // Computed navigation state
  const currentLessonIndex = moduleLessons.findIndex((l) => l.id === lessonId)
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < moduleLessons.length - 1
      ? moduleLessons[currentLessonIndex + 1]
      : null
  const prevLesson = currentLessonIndex > 0 ? (moduleLessons[currentLessonIndex - 1] ?? null) : null
  const isLastLesson = currentLessonIndex >= 0 && currentLessonIndex === moduleLessons.length - 1
  const completedLessonCount = moduleLessons.filter((l) => moduleProgress[l.id]?.completed).length

  const totalBlocks = state.lesson?.lesson_resources?.length ?? 0
  const completedBlockCount =
    totalBlocks > 0 ? Math.round(((state.progressPercentage ?? 0) / 100) * totalBlocks) : 0

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

      // Check if module will be completed — determine before firing confetti (Fix M-15)
      let willShowModuleComplete = false
      if (moduleId && moduleCompleteShownRef.current !== moduleId) {
        const updatedProgress = {
          ...moduleProgressRef.current,
          [state.lesson!.id]: { completed: true, status: 'completed' },
        }
        const allDone =
          moduleLessonsRef.current.length > 0 &&
          moduleLessonsRef.current.every(
            (l) => updatedProgress[l.id]?.completed || updatedProgress[l.id]?.status === 'completed'
          )
        willShowModuleComplete = allDone
      }

      setShowCelebration(true)
      // Only fire lesson confetti if module completion won't show its own (Fix M-15)
      if (!willShowModuleComplete) {
        try {
          const confetti = (await import('canvas-confetti')).default
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } })
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Confetti failed:', err)
        }
      }
      setTimeout(() => setShowCelebration(false), 4000)

      if (willShowModuleComplete) {
        moduleCompleteShownRef.current = moduleId
        setTimeout(() => setShowModuleComplete(true), 4200)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Completion failed:', err)
      captureError(err, {
        context: 'useLessonViewerState',
        action: 'completeLesson',
        lessonId: state.lesson?.id,
      })
      addToast({ message: 'Gagal menandai selesai. Coba lagi.', type: 'error' })
    }
  }, [state.lesson, state.status, tenantId, user?.id, actions, addToast, moduleId])

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

  // Fix H-11: Throttled to 10s — ProgressReporter handles 5s percentage updates
  const handleVideoTimeUpdate = useCallback(
    async (blockId: string, seconds: number) => {
      if (!lessonId || !tenantId || !user?.id || state.status === 'completed') return

      // Throttle: only update if 10+ seconds have passed since last call
      // ProgressReporter handles the 5-second percentage updates
      const now = Date.now()
      if (now - lastVideoUpdateRef.current < 10000) return
      lastVideoUpdateRef.current = now

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
            setTimeout(() => window.scrollBy({ top: offset, behavior: 'smooth' }), 600)
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

  // Fix L-30: Also scroll to top on start over
  const handleStartOver = useCallback(() => {
    setShowResumeBanner(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    lessonService
      .getModuleTitle(moduleId, tenantId)
      .then((title) => {
        if (!cancelled && title) setModuleTitle(title)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Failed to load module title:', err)
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

  return {
    // Auth / routing
    user,
    tenantId,
    role,
    courseId,
    moduleId,
    lessonId,
    searchParams,
    setSearchParams,

    // State machine
    state,
    actions,

    // Analytics
    sessionStartRef,

    // Sidebar data
    moduleLessons,
    moduleProgress,
    moduleTitle,

    // Navigation
    currentLessonIndex,
    nextLesson,
    prevLesson,
    isLastLesson,
    completedLessonCount,
    completedBlockCount,

    // UI state
    showCelebration,
    setShowCelebration,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    showResumeBanner,
    showModuleComplete,
    setShowModuleComplete,
    lastQuizScore,
    showXPReward,
    activeTab,
    setActiveTab,

    // Callbacks
    handleSelectModule,
    handleSelectLesson,
    handleCompletionMet,
    handleProgressUpdate,
    handleResumeAnchorUpdate,
    handleVideoTimeUpdate,
    handleStartOver,
    handleResume,
  }
}
