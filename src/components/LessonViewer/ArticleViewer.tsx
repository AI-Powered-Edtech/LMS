import { BookOpen, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { cn } from '@/utils/cn'
import { katexSanitizeSchema } from '@/utils/sanitizeMarkdown'

interface ArticleViewerProps {
  content: string
  minReadingTimeSeconds: number
  isCompleted: boolean
  onProgressUpdate: (percentage: number) => void
  onCompletionMet: () => void
  onStartViewing: () => void
}

function formatReadingTime(seconds: number): string {
  if (seconds < 60) return seconds + 'dtk'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? m + 'm ' + s + 'dtk' : m + 'm'
}

export function ArticleViewer({
  content,
  minReadingTimeSeconds,
  isCompleted,
  onProgressUpdate,
  onCompletionMet,
  onStartViewing,
}: ArticleViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [readingTime, setReadingTime] = useState(0)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const hasCalledCompletion = useRef(false)
  const hasStarted = useRef(false)

  // Lazy-load KaTeX CSS for math rendering
  useEffect(() => {
    import('katex/dist/katex.min.css')
  }, [])

  // Active Visibility Timer
  useEffect(() => {
    if (isCompleted) return

    const timer = setInterval(() => {
      if (!document.hidden) {
        setReadingTime((prev) => prev + 1)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isCompleted])

  // Calculate progress based on reading time and scroll
  useEffect(() => {
    if (isCompleted) return

    const timeProgress = Math.min(Math.round((readingTime / minReadingTimeSeconds) * 50), 50)
    const scrollProgress = hasScrolledToBottom ? 50 : 0
    onProgressUpdate(timeProgress + scrollProgress)
  }, [readingTime, minReadingTimeSeconds, hasScrolledToBottom, isCompleted, onProgressUpdate])

  // Check completion conditions
  useEffect(() => {
    if (
      hasScrolledToBottom &&
      readingTime >= minReadingTimeSeconds &&
      !isCompleted &&
      !hasCalledCompletion.current
    ) {
      hasCalledCompletion.current = true
      onCompletionMet()
    }
  }, [hasScrolledToBottom, readingTime, minReadingTimeSeconds, isCompleted, onCompletionMet])

  const handleScroll = useCallback(() => {
    if (!hasStarted.current) {
      hasStarted.current = true
      onStartViewing()
    }
    if (scrollRef.current && !isCompleted) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll > 0) {
        setScrollPercent(Math.min(Math.round((scrollTop / maxScroll) * 100), 100))
      }
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setHasScrolledToBottom(true)
      }
    }
  }, [isCompleted, onStartViewing])

  const timeProgress = Math.min(Math.round((readingTime / minReadingTimeSeconds) * 100), 100)

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-14 custom-scrollbar bg-white dark:bg-slate-950"
    >
      <div className="max-w-4xl mx-auto relative">
        {/* Reading progress tracker */}
        <AnimatePresence>
          {!isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'sticky top-0 z-10 mb-8 px-5 py-4 rounded-xl text-sm font-medium shadow-sm',
                'bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 text-blue-800',
                'dark:from-blue-950/60 dark:to-indigo-950/40 dark:border-blue-800/60 dark:text-blue-300'
              )}
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-slate-700 dark:text-slate-300">
                    Sistem melacak progres membaca Anda. Gulir hingga bawah dan baca minimal{' '}
                    <strong>{minReadingTimeSeconds}</strong> detik.
                  </p>

                  {/* Requirement badges */}
                  <div className="mt-3 flex items-center gap-4 text-xs font-bold">
                    <span
                      className={cn(
                        'flex items-center gap-1.5 transition-colors',
                        hasScrolledToBottom
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Scroll ke bawah
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 transition-colors',
                        readingTime >= minReadingTimeSeconds
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Waktu baca: {formatReadingTime(readingTime)} /{' '}
                      {formatReadingTime(minReadingTimeSeconds)}
                    </span>
                  </div>

                  {/* Time progress bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${timeProgress}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Scroll position indicator */}
                  <div className="mt-2 flex items-center justify-between text-xs text-blue-500/70 dark:text-blue-400/60">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Posisi scroll: {scrollPercent}%
                    </span>
                    <span>{timeProgress}% waktu baca tercapai</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Article content */}
        <div
          className={cn(
            'prose max-w-none',
            'prose-slate prose-blue',
            'prose-headings:font-extrabold prose-headings:tracking-tight',
            'prose-h1:text-3xl prose-h2:text-xl',
            'prose-p:leading-relaxed prose-p:text-slate-600',
            'prose-a:text-blue-600 hover:prose-a:text-blue-700',
            'prose-img:rounded-xl',
            'prose-pre:rounded-xl prose-pre:bg-slate-50',
            // Dark mode prose overrides
            'dark:prose-invert',
            'dark:prose-p:text-slate-400',
            'dark:prose-headings:text-slate-100',
            'dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
            'dark:prose-pre:bg-slate-800',
            'dark:prose-code:text-slate-200',
            'dark:prose-strong:text-slate-200',
            'dark:prose-blockquote:text-slate-400 dark:prose-blockquote:border-slate-700'
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                  <span className="sr-only">(buka di tab baru)</span>
                </a>
              ),
            }}
          >
            {content.replace(/\\n/g, '\n')}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
