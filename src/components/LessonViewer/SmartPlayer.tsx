/**
 * SmartPlayer — Unified lesson playback orchestrator.
 *
 * Composes MultiBlockViewer, AITutorPanel, ProgressReporter, and
 * ScrollProgressBar into a single cohesive experience.
 *
 * Responsibilities:
 * - Renders lesson blocks via MultiBlockViewer
 * - Provides an AI Tutor side-panel toggled by a floating action button
 * - Reports progress to API via the invisible ProgressReporter
 * - Shows a thin scroll-progress indicator at the viewport top
 */

import { Bot, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { AITutorPanel } from '@/src/features/ai-tutor/components/AITutorPanel'
import type { Lesson, LessonProgress } from '@/src/features/lessons'
import { cn } from '@/src/utils/cn'

import { MultiBlockViewer } from './MultiBlockViewer'
import { ProgressReporter } from './ProgressReporter'
import { ScrollProgressBar } from './ScrollProgressBar'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SmartPlayerProps {
  /** Current lesson object (includes lesson_resources, quizzes, assignments) */
  lesson: Lesson
  /** Course ID for AI Tutor context */
  courseId: string
  /** Persisted progress record (may be null for first visit) */
  progress: LessonProgress | null
  /** Whether the lesson is already marked completed */
  isCompleted: boolean
  /** Saved video playback position in seconds */
  savedVideoPosition?: number | null
  /** Block ID of the video whose position was saved */
  savedVideoBlockId?: string | null
  /** Callback when a video block reports a time update */
  onVideoTimeUpdate?: (blockId: string, seconds: number) => void
  /** Callback when progress percentage changes (0-100) */
  onProgressUpdate: (pct: number) => void
  /** Callback when all completion conditions are met */
  onCompletionMet: () => void
  /** Callback on first meaningful interaction */
  onStartViewing: () => void
  /** Callback with resume-anchor data for session restore */
  onResumeAnchorUpdate?: (anchor: {
    lastBlockId: string
    lastBlockIndex: number
    lastBlockOffset: number
  }) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SmartPlayer({
  lesson,
  courseId,
  progress,
  isCompleted,
  savedVideoPosition,
  savedVideoBlockId,
  onVideoTimeUpdate,
  onProgressUpdate,
  onCompletionMet,
  onStartViewing,
  onResumeAnchorUpdate,
}: SmartPlayerProps) {
  const { tenantId } = useAuth()

  // AI Tutor panel visibility
  const [isTutorOpen, setIsTutorOpen] = useState(false)

  // Progress tracking via refs — single source of truth (FL-1 + AR-1 fix).
  // Parent owns canonical state via onProgressUpdate; refs feed ProgressReporter
  // without duplicate useState that caused double tracking & unnecessary re-renders.
  const progressPctRef = useRef(progress?.progress_percentage ?? 0)
  const lastPositionRef = useRef(progress?.last_position ?? 0)

  // Derive viewer status for ProgressReporter
  const reporterStatus: 'started' | 'in_progress' | 'completed' = isCompleted
    ? 'completed'
    : progressPctRef.current > 0
      ? 'in_progress'
      : 'started'

  // ---- Handlers -----------------------------------------------------------

  const handleProgressUpdate = useCallback(
    (pct: number) => {
      progressPctRef.current = Math.max(progressPctRef.current, pct)
      onProgressUpdate(pct)
    },
    [onProgressUpdate]
  )

  const handleVideoTimeUpdate = useCallback(
    (blockId: string, seconds: number) => {
      lastPositionRef.current = Math.max(lastPositionRef.current, seconds)
      onVideoTimeUpdate?.(blockId, seconds)
    },
    [onVideoTimeUpdate]
  )

  const toggleTutor = useCallback(() => {
    setIsTutorOpen((prev) => !prev)
  }, [])

  // Keyboard shortcut: Alt+T toggles AI Tutor (UX-H1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        toggleTutor()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleTutor])

  // ---- Render -------------------------------------------------------------

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {/* Scroll progress indicator — fixed at top */}
      <ScrollProgressBar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lesson blocks */}
        <div
          className={cn(
            'flex-1 overflow-y-auto transition-all duration-300',
            isTutorOpen && 'lg:mr-[380px]'
          )}
        >
          <MultiBlockViewer
            lesson={lesson}
            isCompleted={isCompleted}
            savedVideoPosition={savedVideoPosition}
            savedVideoBlockId={savedVideoBlockId}
            onVideoTimeUpdate={handleVideoTimeUpdate}
            onProgressUpdate={handleProgressUpdate}
            onCompletionMet={onCompletionMet}
            onStartViewing={onStartViewing}
            onResumeAnchorUpdate={onResumeAnchorUpdate}
          />
        </div>

        {/* AI Tutor side panel — slides in from right */}
        <AnimatePresence>
          {isTutorOpen && (
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
              className={cn(
                'fixed right-0 top-0 bottom-0 w-[380px] z-40 border-l shadow-xl',
                'bg-white dark:bg-slate-900',
                'border-slate-200 dark:border-slate-700',
                'lg:absolute'
              )}
            >
              {/* Close button (mobile-friendly) */}
              <button
                onClick={toggleTutor}
                aria-label="Tutup AI Tutor"
                className={cn(
                  'absolute top-3 right-3 z-50 p-2 rounded-xl transition-colors',
                  'hover:bg-slate-100 dark:hover:bg-slate-800',
                  'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                )}
              >
                <X className="w-5 h-5" />
              </button>

              <AITutorPanel
                lessonId={lesson.id}
                lessonTitle={lesson.title}
                courseId={courseId}
                onClose={toggleTutor}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* AI Tutor FAB (Floating Action Button) */}
      <AnimatePresence>
        {!isTutorOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            onClick={toggleTutor}
            aria-label="Buka AI Tutor"
            className={cn(
              'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-violet-500 to-purple-600',
              'shadow-xl shadow-purple-500/30',
              'hover:shadow-2xl hover:shadow-purple-500/40',
              'transition-shadow'
            )}
          >
            <Bot className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Invisible progress reporter */}
      {tenantId && (
        <ProgressReporter
          lessonId={lesson.id}
          tenantId={tenantId}
          status={reporterStatus}
          progressPercentage={progressPctRef.current}
          lastPosition={lastPositionRef.current}
          enabled={!isCompleted}
        />
      )}
    </div>
  )
}
