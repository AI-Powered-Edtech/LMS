import { AlertTriangle, CheckCircle2, FileText, Lock, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useInteractiveVideoEvents } from '@/features/lessons/hooks/useInteractiveVideoEvents'
import { QuizViewer } from '@/features/quizzes/components/QuizViewer'
import { AdaptiveVideoPlayer, type CaptionTrack } from '@/features/video'
import { cn } from '@/utils/cn'

interface Transcript {
  time: number
  text: string
}

interface VideoViewerProps {
  videoUrl: string
  transcripts?: Transcript[]
  metadata?: Record<string, unknown>
  savedPosition: number
  isCompleted: boolean
  onProgressUpdate: (percentage: number, position: number) => void
  onCompletionMet: () => void
  onStartViewing: () => void
  /** WebVTT caption tracks to display on the video */
  captions?: CaptionTrack[]
}

/**
 * Detect whether a URL should be streamed via HLS.
 * Returns the HLS URL if detected, or null for regular mp4/webm.
 */
function detectHlsUrl(url: string): string | null {
  if (!url) return null
  const lower = url.toLowerCase()
  if (lower.includes('.m3u8') || lower.includes('/hls/') || lower.includes('/stream.mux.com/')) {
    return url
  }
  return null
}

export function VideoViewer({
  videoUrl,
  transcripts,
  metadata,
  savedPosition,
  isCompleted,
  onProgressUpdate,
  onCompletionMet,
  onStartViewing,
  captions,
}: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [maxWatchedTime, setMaxWatchedTime] = useState(savedPosition)
  const maxWatchedRef = useRef(savedPosition)
  const isCompletedRef = useRef(isCompleted)
  isCompletedRef.current = isCompleted
  const [isStalled, setIsStalled] = useState(false)
  const isStalledRef = useRef(isStalled)
  isStalledRef.current = isStalled
  const [mediaError, setMediaError] = useState<string | null>(null)
  const hasCalledCompletion = useRef(false)

  // Detect HLS vs plain mp4
  const hlsUrl = detectHlsUrl(videoUrl)
  const mp4Url = hlsUrl ? null : videoUrl

  // Also check metadata for explicit hls_url override
  const metaHlsUrl =
    metadata && typeof (metadata as Record<string, unknown>).hls_url === 'string'
      ? ((metadata as Record<string, unknown>).hls_url as string)
      : null
  const resolvedHlsUrl = metaHlsUrl || hlsUrl
  const resolvedMp4Url = metaHlsUrl ? mp4Url || videoUrl : mp4Url

  // Interactive Video — shared hook
  const { activeEvent, loadedQuizzes, checkForEvent, handleEventComplete } =
    useInteractiveVideoEvents({ metadata, videoRef })

  // Session restore: seek to saved position
  useEffect(() => {
    if (videoRef.current && savedPosition > 0) {
      videoRef.current.currentTime = savedPosition
      maxWatchedRef.current = savedPosition
      setMaxWatchedTime(savedPosition)
    }
  }, [savedPosition])

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    const time = videoRef.current.currentTime
    const duration = videoRef.current.duration
    setCurrentTime(time)

    // Interactive event check (pauses video if triggered)
    if (checkForEvent(time)) return

    if (time > maxWatchedRef.current) {
      maxWatchedRef.current = time
      setMaxWatchedTime(time)
    }

    if (duration > 0) {
      // Progress display uses the high-water mark position
      const displayPct = Math.round((maxWatchedRef.current / duration) * 100)
      onProgressUpdate(displayPct, Math.floor(time))

      // Completion: high-water mark must reach 95% (enforced by handleSeeking anti-cheat)
      if (displayPct >= 95 && !isCompletedRef.current && !hasCalledCompletion.current) {
        hasCalledCompletion.current = true
        onCompletionMet()
      }
    }
  }, [onProgressUpdate, onCompletionMet, checkForEvent])

  const handleSeeking = useCallback(() => {
    if (videoRef.current && videoRef.current.currentTime > maxWatchedRef.current) {
      videoRef.current.currentTime = maxWatchedRef.current
    }
  }, [])

  const handlePlay = useCallback(() => {
    onStartViewing()
  }, [onStartViewing])

  const handleTranscriptClick = (time: number) => {
    // Use ref instead of state to avoid stale value lag (M-24)
    if (videoRef.current && time <= maxWatchedRef.current) {
      videoRef.current.currentTime = time
      videoRef.current.play().catch(() => {
        // Auto-play blocked by browser policy — user must interact to play
      })
    }
  }

  const handleWaitingOrStalled = useCallback(() => {
    setIsStalled(true)
  }, [])

  const handleCanPlay = useCallback(() => {
    setIsStalled(false)
  }, [])

  const handleMediaError = useCallback(() => {
    if (!videoRef.current) return
    const err = videoRef.current.error
    let msg = 'Video tidak dapat diputar.'
    if (err) {
      switch (err.code) {
        case MediaError.MEDIA_ERR_NETWORK:
          // Network error — treat as stall, not fatal
          setIsStalled(true)
          return
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          msg = 'Format video tidak didukung oleh browser Anda.'
          break
        case MediaError.MEDIA_ERR_DECODE:
          msg = 'Video rusak atau tidak dapat didekode.'
          break
        default:
          msg = 'Terjadi kesalahan saat memuat video.'
      }
    }
    setMediaError(msg)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      if (videoRef.current && isStalledRef.current) {
        const currentPos = videoRef.current.currentTime
        videoRef.current.load()
        videoRef.current.currentTime = currentPos
        videoRef.current.play().catch((e) => {
          if (import.meta.env.DEV) console.error('Recovery play failed', e)
        })
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, []) // stable — uses ref internally

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col lg:flex-row md:gap-8 max-w-[1400px] mx-auto p-6 md:p-10">
      {/* Empty State */}
      {!videoUrl ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center min-h-[400px]">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Video Belum Tersedia
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            Materi video untuk pelajaran ini belum ditambahkan. Jika Anda adalah instruktur, silakan
            masukkan URL video terlebih dahulu.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video player wrapper */}
          <div
            className={cn(
              'aspect-video rounded-2xl overflow-hidden shadow-xl border relative group',
              'bg-slate-900',
              'border-slate-200/50 dark:border-slate-700/50',
              isCompleted && 'ring-2 ring-green-400/60 dark:ring-green-500/50'
            )}
          >
            {/* AdaptiveVideoPlayer handles HLS.js + Safari native HLS + MP4 fallback */}
            <AdaptiveVideoPlayer
              hlsUrl={resolvedHlsUrl}
              mp4Url={resolvedMp4Url}
              controls={!activeEvent}
              videoRef={videoRef}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onPlay={handlePlay}
              onWaiting={handleWaitingOrStalled}
              onStalled={handleWaitingOrStalled}
              onError={handleMediaError}
              onCanPlay={handleCanPlay}
              controlsList="nodownload"
              aria-label="Video pelajaran"
              className="w-full h-full"
              captions={captions}
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
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                          Kuis Pop-up
                        </h3>
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

            {/* Network Stall Overlay */}
            <AnimatePresence>
              {isStalled && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20"
                >
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-xl font-bold mb-2">Koneksi Terputus...</h3>
                  <p className="text-sm text-slate-300">
                    Menunggu jaringan kembali stabil. Video akan otomatis dilanjutkan.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Media Error Overlay */}
            <AnimatePresence>
              {mediaError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 p-6"
                >
                  <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
                  <h3 className="text-lg font-bold mb-2">Kesalahan Video</h3>
                  <p className="text-sm text-slate-300 text-center">{mediaError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Completion badge overlay */}
            <AnimatePresence>
              {isCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 280 }}
                  className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Video Selesai
                </motion.div>
              )}
            </AnimatePresence>

            {/* Anti-skip hint */}
            {!isCompleted && !isStalled && (
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                Tonton hingga selesai (lewati dinonaktifkan)
              </div>
            )}
          </div>

          {/* Info panel */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className={cn(
              'mt-6 p-6 rounded-2xl border w-full mb-6 lg:mb-0 shadow-sm',
              'bg-gradient-to-r from-white to-slate-50/50 border-slate-100',
              'dark:from-slate-800 dark:to-slate-900/50 dark:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Tentang Video Ini
              </h3>
              {/* NOTE: Diskusi lesson tersedia di tab Diskusi pada LessonViewer. Lihat DiscussionBoard component. */}
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Pastikan Anda menonton hingga akhir agar sistem mencatat progres Anda secara otomatis.
            </p>
          </motion.div>
        </div>
      )}

      {/* Transcripts panel */}
      {transcripts && transcripts.length > 0 && (
        <div
          className={cn(
            'w-full lg:w-96 rounded-2xl border flex flex-col h-[500px] shrink-0 sticky top-0 mt-6 lg:mt-0',
            'bg-white dark:bg-slate-900',
            'border-slate-200 dark:border-slate-700'
          )}
        >
          <div
            className={cn(
              'p-5 border-b flex items-center justify-between rounded-t-2xl z-10 shrink-0',
              'bg-white dark:bg-slate-900',
              'border-slate-100 dark:border-slate-800'
            )}
          >
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              Transkrip Interaktif
              {captions && captions.length > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                  CC
                </span>
              )}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {transcripts.map((transcript, idx) => {
              const isPast = currentTime >= transcript.time
              const isNext = transcripts[idx + 1] ? currentTime < transcripts[idx + 1].time : true
              const isActive = isPast && isNext
              const isLocked = transcript.time > maxWatchedTime

              return (
                <button
                  key={idx}
                  onClick={() => handleTranscriptClick(transcript.time)}
                  disabled={isLocked}
                  aria-label={`Lompat ke ${Math.floor(transcript.time / 60)}:${(transcript.time % 60).toString().padStart(2, '0')} — ${transcript.text.slice(0, 50)}`}
                  className={cn(
                    'w-full text-left p-4 rounded-xl transition-all text-sm border',
                    isActive
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
                      : 'bg-white dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700',
                    isLocked &&
                      'opacity-60 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-bold block mb-1.5 flex items-center gap-1.5',
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-blue-400/70 dark:text-blue-500/60'
                    )}
                  >
                    {Math.floor(transcript.time / 60)}:
                    {(transcript.time % 60).toString().padStart(2, '0')}
                    {isLocked && <Lock className="w-3 h-3 text-slate-400 dark:text-slate-600" />}
                  </span>
                  <span
                    className={cn(
                      'leading-relaxed',
                      isActive
                        ? 'text-slate-800 dark:text-slate-100 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {transcript.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
