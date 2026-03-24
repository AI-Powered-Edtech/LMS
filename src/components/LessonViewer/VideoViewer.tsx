import { AlertTriangle, CheckCircle2, FileText, Lock, MessageSquare, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useInteractiveVideoEvents } from '@/src/features/lessons/hooks/useInteractiveVideoEvents'
import { QuizViewer } from '@/src/features/quizzes/components/QuizViewer'
import { cn } from '@/src/utils/cn'

interface Transcript {
  time: number
  text: string
}

interface InVideoQuiz {
  time: number
  question: string
  options: string[]
  correctAnswer: number
}

interface VideoViewerProps {
  videoUrl: string
  transcripts?: Transcript[]
  inVideoQuizzes?: InVideoQuiz[]
  metadata?: Record<string, unknown>
  savedPosition: number
  isCompleted: boolean
  onProgressUpdate: (percentage: number, position: number) => void
  onCompletionMet: () => void
  onStartViewing: () => void
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
}: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [maxWatchedTime, setMaxWatchedTime] = useState(savedPosition)
  const [isStalled, setIsStalled] = useState(false)
  const hasCalledCompletion = useRef(false)

  // Interactive Video — shared hook
  const { activeEvent, loadedQuizzes, checkForEvent, handleEventComplete } =
    useInteractiveVideoEvents({ metadata, videoRef })

  // Session restore: seek to saved position
  useEffect(() => {
    if (videoRef.current && savedPosition > 0) {
      videoRef.current.currentTime = savedPosition
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

    if (time > maxWatchedTime) {
      setMaxWatchedTime(time)
    }

    if (duration > 0) {
      const percentage = Math.round((Math.max(time, maxWatchedTime) / duration) * 100)
      onProgressUpdate(percentage, Math.floor(time))

      if (percentage >= 95 && !isCompleted && !hasCalledCompletion.current) {
        hasCalledCompletion.current = true
        onCompletionMet()
      }
    }
  }, [maxWatchedTime, isCompleted, onProgressUpdate, onCompletionMet, checkForEvent])

  const handleSeeking = useCallback(() => {
    if (videoRef.current && videoRef.current.currentTime > maxWatchedTime + 1) {
      videoRef.current.currentTime = maxWatchedTime
    }
  }, [maxWatchedTime])

  const handlePlay = useCallback(() => {
    onStartViewing()
  }, [onStartViewing])

  const handleTranscriptClick = (time: number) => {
    if (videoRef.current && time <= maxWatchedTime) {
      videoRef.current.currentTime = time
      videoRef.current.play()
    }
  }

  const handleWaitingOrStalled = useCallback(() => {
    setIsStalled(true)
  }, [])

  const handleCanPlay = useCallback(() => {
    setIsStalled(false)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      if (videoRef.current && isStalled) {
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
  }, [isStalled])

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
            <video
              ref={videoRef}
              src={videoUrl}
              controls={!activeEvent}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onPlay={handlePlay}
              onWaiting={handleWaitingOrStalled}
              onStalled={handleWaitingOrStalled}
              onError={handleWaitingOrStalled}
              onCanPlay={handleCanPlay}
              className="w-full h-full object-cover"
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
              <button className="hidden sm:flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <MessageSquare className="w-4 h-4" />
                Tanyakan di Ruang Diskusi
              </button>
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
