import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Clock,
  FileText,
  HelpCircle,
  Lock,
  PlayCircle,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useRef, useState } from 'react'

import { SkeletonCard } from '@/src/components/ui'
import type { Lesson, LessonProgress } from '@/src/features/lessons'
import {
  formatDuration,
  getLessonDuration,
  getModuleDuration,
  isLessonLocked,
} from '@/src/features/lessons'
import { cn } from '@/src/utils/cn'

interface LessonSidebarProps {
  moduleTitle?: string
  lessons: Lesson[]
  progress: Record<string, LessonProgress>
  activeLessonId: string | null
  onSelectLesson: (lessonId: string) => void
  onBack?: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
  userRole?: string
}

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  video: PlayCircle,
  article: FileText,
  quiz: HelpCircle,
}

const typeLabels: Record<string, string> = {
  video: 'Video',
  article: 'Artikel',
  quiz: 'Kuis',
}

export const LessonSidebar = memo(function LessonSidebar({
  moduleTitle,
  lessons,
  progress,
  activeLessonId,
  onSelectLesson,
  onBack,
  isMobileOpen,
  onMobileClose,
  userRole,
}: LessonSidebarProps) {
  const completedCount = lessons.filter((l) => progress[l.id]?.status === 'completed').length
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: lessons.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // estimated height of each lesson card in px
    overscan: 5,
  })

  // Mobile drawer content
  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-white dark:from-slate-800 to-blue-50/30 dark:to-slate-800/50 border-b border-slate-100 dark:border-slate-700 z-10 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        )}
        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            aria-label="Tutup sidebar"
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        )}
        <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-3 leading-snug">
          {moduleTitle || 'Daftar Pelajaran'}
        </h2>
        {lessons.length > 0 &&
          (() => {
            const progressPct = Math.round((completedCount / lessons.length) * 100)
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {progressPct}% Selesai
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {completedCount}/{lessons.length}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </>
            )
          })()}
        {lessons.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            {lessons.length} pelajaran &bull; {formatDuration(getModuleDuration(lessons))}
          </p>
        )}
      </div>

      {/* Lesson List - Virtualized */}
      <div ref={parentRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
        {/* Toast for locked lessons */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-2 left-4 right-4 z-30 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm px-4 py-3 rounded-lg shadow-lg"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
        {lessons.length === 0 ? (
          <div className="p-4 space-y-3">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
        ) : (
          <div
            className="w-full relative"
            style={{ height: `${rowVirtualizer.getTotalSize() + 32}px` }} // +32px for top/bottom padding 16px
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const lesson = lessons[virtualRow.index]
              const prog = progress[lesson.id]
              const isCompleted = prog?.status === 'completed'
              const isActive = lesson.id === activeLessonId
              const isLocked = isLessonLocked(lessons, progress, virtualRow.index, userRole)

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute top-0 left-0 w-full px-4 pb-3"
                  style={{
                    transform: `translateY(${virtualRow.start + 16}px)`, // +16px top padding offset
                  }}
                >
                  <button
                    onClick={() => {
                      if (isLocked) {
                        setToastMessage('Selesaikan pelajaran sebelumnya terlebih dahulu')
                        setTimeout(() => setToastMessage(null), 3000)
                        return
                      }
                      onSelectLesson(lesson.id)
                      onMobileClose?.()
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={isLocked}
                    className={cn(
                      'w-full text-left p-4 rounded-xl transition-all flex items-start gap-4 group border outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-blue-900/30 dark:to-indigo-900/20 border-blue-200/80 dark:border-blue-700/60 shadow-md shadow-blue-100/50 dark:shadow-blue-900/20 ring-1 ring-blue-100 dark:ring-blue-800/50'
                        : isLocked
                          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 cursor-not-allowed opacity-60'
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm dark:hover:bg-slate-700/50'
                    )}
                  >
                    {/* Status Icon */}
                    <div
                      className={cn(
                        'mt-0.5 shrink-0 transition-colors',
                        isLocked
                          ? 'text-slate-400'
                          : isCompleted
                            ? 'text-green-500'
                            : 'text-slate-300 group-hover:text-green-400',
                        isActive && !isCompleted && !isLocked ? 'text-blue-500' : ''
                      )}
                    >
                      {isLocked ? (
                        <Lock className="w-5 h-5" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : isActive ? (
                        <PlayCircle className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </div>
                    <span className="sr-only">
                      {isLocked
                        ? 'Pelajaran terkunci'
                        : isCompleted
                          ? 'Pelajaran selesai'
                          : 'Pelajaran belum selesai'}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-bold leading-snug mb-2',
                          isActive
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                        )}
                      >
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                          {(() => {
                            const Icon = typeIcons[lesson.type] || FileText
                            return <Icon className="w-3.5 h-3.5" />
                          })()}
                          {typeLabels[lesson.type] || lesson.type}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          {formatDuration(getLessonDuration(lesson))}
                        </span>

                        {lesson.passing_score && lesson.type === 'quiz' ? (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-md',
                              isActive
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            )}
                          >
                            Min. Skor: {lesson.passing_score}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )

  // Desktop layout (lg and above) - static sidebar
  const desktopSidebar = (
    <aside className="w-full lg:w-80 bg-white border border-slate-200/70 rounded-2xl flex flex-col shrink-0 h-full overflow-hidden shadow-lg shadow-slate-200/50 z-20 dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/50">
      {sidebarContent}
    </aside>
  )

  // Mobile drawer layout - overlay
  const mobileDrawer = (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 dark:bg-black/60 z-40 lg:hidden pointer-events-auto"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white border-r border-slate-200/70 flex flex-col shadow-2xl shadow-slate-900/30 z-50 lg:hidden dark:bg-slate-900 dark:border-slate-700"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )

  // On desktop, render static sidebar
  // On mobile, render drawer (even when closed, to allow opening)
  // The actual visibility is controlled by isMobileOpen prop
  if (!isMobileOpen && !onMobileClose) {
    // No mobile props passed - render desktop only (original behavior)
    return desktopSidebar
  }

  // Mobile mode - render both desktop placeholder (hidden on mobile) and drawer
  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden lg:block">{desktopSidebar}</div>

      {/* Mobile drawer */}
      {mobileDrawer}
    </>
  )
})
