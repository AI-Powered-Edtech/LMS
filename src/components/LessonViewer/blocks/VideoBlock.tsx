import { AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useOptionalLearningSession } from '@/features/analytics'
import { useInteractiveVideoEvents } from '@/features/lessons/hooks/useInteractiveVideoEvents'
import { QuizViewer } from '@/features/quizzes/components/QuizViewer'
import { parseVideoUrl, type VideoType } from '@/utils/videoUtils'

interface VideoBlockProps {
  blockId?: string
  url: string
  metadata?: Record<string, unknown>
  isCompleted: boolean
  savedVideoPosition?: number | null // seconds
  onProgressUpdate?: (percentage: number) => void
  onCompletionMet?: () => void
  onStartViewing?: () => void
  onVideoTimeUpdate?: (seconds: number) => void // NEW: report current time
}

/**
 * VideoBlock - A block component for rendering videos (YouTube, Vimeo, or direct)
 *
 * Features:
 * - YouTube/Vimeo embed support via iframe
 * - Direct video support via video element
 * - Progress tracking using timeupdate (direct) or IntersectionObserver (embed)
 * - 16:9 aspect ratio wrapper
 * - Interactive Video (pop-up quizzes at specific timestamps)
 */
export function VideoBlock({
  blockId,
  url,
  metadata,
  isCompleted,
  savedVideoPosition,
  onProgressUpdate = () => {},
  onCompletionMet = () => {},
  onStartViewing = () => {},
  onVideoTimeUpdate,
}: VideoBlockProps) {
  const { trackEvent } = useOptionalLearningSession()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasCalledCompletion = useRef(false)
  const lastReportedSecond = useRef(0)
  // H3: Anti-skip — high-water mark for the furthest point the student has watched
  // VB-2 FIX: Initialize to savedVideoPosition so canplay seek is not clamped
  const maxWatchedTimeRef = useRef(savedVideoPosition ?? 0)
  // L3: Initialize to null to avoid flash before URL is parsed
  const [videoType, setVideoType] = useState<VideoType | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  // Interactive Video — shared hook
  const { activeEvent, loadedQuizzes, checkForEvent, handleEventComplete } =
    useInteractiveVideoEvents({ metadata, videoRef })

  // VB-2 FIX: Sync maxWatchedTimeRef when savedVideoPosition changes
  // This ensures anti-skip doesn't block resume seeks
  useEffect(() => {
    if (savedVideoPosition != null && savedVideoPosition > maxWatchedTimeRef.current) {
      maxWatchedTimeRef.current = savedVideoPosition
    }
  }, [savedVideoPosition])

  // Parse URL on mount or when URL changes
  useEffect(() => {
    if (url) {
      const parsed = parseVideoUrl(url)
      setVideoType(parsed.type)
      setEmbedUrl(parsed.embedUrl)
    } else {
      setVideoType('direct')
      setEmbedUrl(null)
    }
  }, [url])

  // Progress tracking for direct videos using timeupdate
  // Also handles video resume from saved position
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || videoType !== 'direct') return

    const video = videoRef.current
    const currentTime = video.currentTime
    const duration = video.duration

    // Interactive event check (pauses video if triggered)
    if (checkForEvent(currentTime)) return

    if (duration > 0) {
      // H3: Track the furthest point watched (high-water mark)
      if (currentTime > maxWatchedTimeRef.current) {
        maxWatchedTimeRef.current = currentTime
      }

      const percentage = Math.round((currentTime / duration) * 100)
      onProgressUpdate(percentage)

      // L5: Use hasCalledCompletion.current only — avoids dep on isCompleted
      // Completion: 95% watched
      if (percentage >= 95 && !hasCalledCompletion.current) {
        hasCalledCompletion.current = true
        onCompletionMet()
      }

      // Report time update every 5 seconds to avoid flooding
      const currentSecond = Math.floor(currentTime)
      if (currentSecond - lastReportedSecond.current >= 5) {
        lastReportedSecond.current = currentSecond
        onVideoTimeUpdate?.(currentSecond)
        trackEvent('VIDEO_PROGRESS', {
          block_id: blockId ?? '',
          position: currentSecond,
          duration: Math.round(duration),
          percent: percentage,
        })
      }
    }
  }, [
    videoType,
    // L5: isCompleted removed from deps — checked via hasCalledCompletion.current
    onProgressUpdate,
    onCompletionMet,
    onVideoTimeUpdate,
    trackEvent,
    blockId,
    checkForEvent,
  ])

  // Progress tracking for embedded videos (YouTube/Vimeo) using IntersectionObserver + timer
  useEffect(() => {
    if (videoType === 'direct' || !containerRef.current) return

    const container = containerRef.current
    let visibleSeconds = 0
    let visibilityCheckInterval: ReturnType<typeof setInterval> | null = null
    // Required minimum visible seconds before auto-completing (2 minutes)
    const REQUIRED_VISIBLE_SECONDS = 120

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            onStartViewing()

            // Start counting visible seconds
            if (!visibilityCheckInterval && !isCompleted && !hasCalledCompletion.current) {
              visibilityCheckInterval = setInterval(() => {
                // Only count time when tab is visible
                if (document.visibilityState === 'visible') {
                  visibleSeconds += 1
                  // H2: Report intermediate progress so student doesn't see 0% for 2 minutes
                  const intermediatePct = Math.min(
                    Math.round((visibleSeconds / REQUIRED_VISIBLE_SECONDS) * 79),
                    79
                  )
                  onProgressUpdate(intermediatePct)
                }
                if (visibleSeconds >= REQUIRED_VISIBLE_SECONDS && !hasCalledCompletion.current) {
                  hasCalledCompletion.current = true
                  onProgressUpdate(80)
                  onCompletionMet()
                  if (visibilityCheckInterval) {
                    clearInterval(visibilityCheckInterval)
                    visibilityCheckInterval = null
                  }
                }
              }, 1000)
            }
          } else {
            // Pause counting when out of view, but don't reset
            if (visibilityCheckInterval) {
              clearInterval(visibilityCheckInterval)
              visibilityCheckInterval = null
            }
          }
        })
      },
      { threshold: 0.5 } // Also fix H-16: reduced from 0.8 to 0.5
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
      if (visibilityCheckInterval) clearInterval(visibilityCheckInterval)
    }
  }, [videoType, isCompleted, onProgressUpdate, onCompletionMet, onStartViewing])

  // Handle play event
  const handlePlay = useCallback(() => {
    onStartViewing()
  }, [onStartViewing])

  // Handle canplay event - seek to saved position for direct videos
  const handleCanPlay = useCallback(() => {
    // Only seek for direct video elements (YouTube/Vimeo embeds don't allow JS seeking)
    // VB-2 FIX: maxWatchedTimeRef is already initialized to savedVideoPosition,
    // so the anti-skip handler won't block this seek
    if (savedVideoPosition && videoRef.current && videoType === 'direct') {
      videoRef.current.currentTime = savedVideoPosition
    }
  }, [savedVideoPosition, videoType])

  // H3: Anti-skip — prevent seeking FORWARD past unwatched portion
  // VB-4 FIX: Only clamp forward seeks, allow backward seeking (rewind)
  const handleSeeking = useCallback(() => {
    if (!videoRef.current) return
    const targetTime = videoRef.current.currentTime
    // Only block forward skips past the high-water mark (+ 2s tolerance)
    // Allow backward seeks (rewind) freely
    if (targetTime > maxWatchedTimeRef.current + 2) {
      videoRef.current.currentTime = maxWatchedTimeRef.current
    }
  }, [])

  // L3: Don't render anything until URL is parsed to avoid type flash
  if (!videoType) return null

  // Render embedded video (YouTube/Vimeo)
  // Note: Seeking is not possible via JS for embeds due to cross-origin restrictions.
  // The savedVideoPosition prop is silently ignored for YouTube/Vimeo embeds.
  if (videoType === 'youtube' || videoType === 'vimeo') {
    if (!embedUrl) {
      return <VideoUnavailable />
    }

    return (
      <div className="px-6 py-4">
        <div ref={containerRef} className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            // VB-7 FIX: Added allow-forms and allow-popups for YouTube/Vimeo compatibility
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
            // L2: Unique title per iframe for accessibility
            title={blockId ? `Pemutar video ${blockId.slice(-6)}` : 'Pemutar video'}
          />
        </div>
      </div>
    )
  }

  // Render direct video
  if (videoType === 'direct') {
    if (!url) {
      return <VideoUnavailable />
    }

    return (
      <div className="px-6 py-4">
        <div ref={containerRef} className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={url}
            controls={!activeEvent}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onCanPlay={handleCanPlay}
            // H3: Anti-skip handler (VB-4 FIX: only blocks forward seeks)
            onSeeking={handleSeeking}
            className="absolute inset-0 w-full h-full rounded-lg"
            controlsList="nodownload"
          />

          {/* Interactive Event Overlay */}
          <AnimatePresence>
            {activeEvent &&
              activeEvent.type === 'quiz' &&
              activeEvent.quizId &&
              loadedQuizzes[activeEvent.quizId] && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/95 z-20 flex items-center justify-center rounded-lg overflow-y-auto"
                >
                  <div className="w-full max-w-4xl p-6 bg-white dark:bg-slate-900 rounded-2xl max-h-full overflow-y-auto">
                    <div className="mb-4 flex items-center sticky top-0 bg-white dark:bg-slate-900 z-10 py-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">Kuis Pop-up</h3>
                    </div>
                    <QuizViewer
                      quizId={loadedQuizzes[activeEvent.quizId].id}
                      title={loadedQuizzes[activeEvent.quizId].title}
                      instructions={loadedQuizzes[activeEvent.quizId].instructions}
                      questions={loadedQuizzes[activeEvent.quizId].quiz_questions}
                      maxAttempts={loadedQuizzes[activeEvent.quizId].max_attempts}
                      passingScore={loadedQuizzes[activeEvent.quizId].passing_score ?? 0}
                      isCompleted={false}
                      onCompletionMet={handleEventComplete}
                      onStartViewing={() => {}}
                    />
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // Fallback for unknown types
  return <VideoUnavailable />
}

/**
 * Video unavailable fallback UI
 */
function VideoUnavailable() {
  return (
    <div className="px-6 py-4">
      <div
        className="relative w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center"
        style={{ aspectRatio: '16/9' }}
      >
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Video tidak tersedia
        </p>
      </div>
    </div>
  )
}
