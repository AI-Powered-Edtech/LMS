import { Activity, Pause, Play, Radio } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { analyticsService, type LiveEvent } from '@/features/analytics/api/analyticsService'

const EVENT_LABELS: Record<string, string> = {
  LESSON_STARTED: 'mulai pelajaran',
  LESSON_COMPLETED: 'menyelesaikan pelajaran',
  QUIZ_STARTED: 'mulai kuis',
  QUIZ_SUBMITTED: 'mengumpulkan kuis',
  BLOCK_VIEWED: 'melihat konten',
  VIDEO_PROGRESS: 'menonton video',
  ASSIGNMENT_SUBMITTED: 'mengumpulkan tugas',
}

const EVENT_COLORS: Record<string, string> = {
  LESSON_COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  QUIZ_SUBMITTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  ASSIGNMENT_SUBMITTED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  LESSON_STARTED: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
}

interface LiveActivityFeedProps {
  onActiveUsersChange?: (count: number) => void
  onActiveLessonsChange?: (lessonIds: Set<string>) => void
}

export function LiveActivityFeed({
  onActiveUsersChange,
  onActiveLessonsChange,
}: LiveActivityFeedProps) {
  const { activeTenant } = useAuth()
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeTenant) return

    let isMounted = true

    const fetchEvents = async () => {
      if (isPaused) return
      try {
        const data = await analyticsService.fetchLatestEvents(String(activeTenant), 10)

        if (isMounted && data) {
          setEvents((prev) => {
            const newEvents = data.filter((d: LiveEvent) => !prev.some((p) => p.id === d.id))
            const merged = [...newEvents, ...prev]
            // sort by created_at desc so latest is first
            merged.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            return merged.slice(0, 50)
          })
          setIsConnected(true)
        }
      } catch (err) {
        console.error('Failed to fetch live events', err)
        if (isMounted) setIsConnected(false)
      }
    }

    // Initial fetch
    fetchEvents()

    // Poll every 15 seconds instead of keeping a WebSocket open
    const pollInterval = setInterval(fetchEvents, 15000)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [activeTenant, isPaused])

  // Update active users/lessons for parent components
  useEffect(() => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const recentEvents = events.filter((e) => e.created_at >= fiveMinAgo)
    const activeUsers = new Set(recentEvents.map((e) => e.user_id))
    const activeLessons = new Set(
      recentEvents.filter((e) => e.lesson_id).map((e) => e.lesson_id as string)
    )
    onActiveUsersChange?.(activeUsers.size)
    onActiveLessonsChange?.(activeLessons)
  }, [events, onActiveUsersChange, onActiveLessonsChange])

  // Auto-scroll
  useEffect(() => {
    if (!isPaused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events, isPaused])

  const formatTime = useCallback((iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, [])

  const handleTogglePause = useCallback(() => setIsPaused((p) => !p), [])

  // Hitung jumlah event aktif untuk info footer
  const eventCount = useMemo(() => events.length, [events])

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
          <span className="text-sm font-bold text-slate-800 dark:text-white">Live Activity</span>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={handleTogglePause}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {isPaused ? 'Lanjut' : 'Jeda'}
        </button>
      </div>

      {/* Feed */}
      <div className="h-80 overflow-y-auto p-3 space-y-2">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <Activity className="h-8 w-8" />
            <p className="text-sm">Menunggu aktivitas siswa...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${EVENT_COLORS[event.event_type] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  {EVENT_LABELS[event.event_type] ??
                    event.event_type.toLowerCase().replace('_', ' ')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    <span className="font-semibold">{event.student_name ?? 'Siswa'}</span>
                    {event.lesson_title && (
                      <span className="text-slate-400"> — {event.lesson_title}</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {formatTime(event.created_at)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {eventCount > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            Menampilkan {eventCount} event terbaru
            {isPaused && <span className="ml-2 font-semibold text-amber-500">(dijeda)</span>}
          </p>
        </div>
      )}
    </div>
  )
}
