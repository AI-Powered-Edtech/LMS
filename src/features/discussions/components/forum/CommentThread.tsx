import { CheckCircle, Flag, GraduationCap, MoreHorizontal, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import remarkMath from 'remark-math'

import { OptimizedImage } from '@/components/ui'
import type { ForumComment } from '@/features/discussions/types/forum'
import { cn } from '@/utils/cn'
import { katexSanitizeSchema } from '@/utils/sanitizeMarkdown'

import { ForumBadge, resolveBadgeType } from './ForumBadge'

interface CommentThreadProps {
  comment: ForumComment
  depth?: number
  isBestAnswer?: boolean
  onMarkBest?: (id: string) => void
  isTeacher: boolean
  onReport: (id: string, type: 'comment', snippet: string, author: string) => void
}

export function CommentThread({
  comment,
  depth = 0,
  isBestAnswer = false,
  onMarkBest,
  isTeacher,
  onReport,
}: CommentThreadProps) {
  const [upvoted, setUpvoted] = useState(false)
  const [showReport, setShowReport] = useState(false)

  return (
    <div className={cn('flex gap-3', depth > 0 && 'ml-6 md:ml-12 mt-4')}>
      <div className="flex flex-col items-center">
        <OptimizedImage
          src={comment.avatar}
          alt=""
          className={cn(
            'rounded-full bg-slate-100 dark:bg-slate-700',
            depth === 0 ? 'w-10 h-10' : 'w-8 h-8'
          )}
        />
        {comment.replies && comment.replies.length > 0 && (
          <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-600 my-2 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'p-4 rounded-2xl rounded-tl-none border transition-all',
            isBestAnswer
              ? 'bg-green-50 border-green-200 shadow-sm dark:bg-green-900/20 dark:border-green-700'
              : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'
          )}
        >
          {isBestAnswer && (
            <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 text-xs font-bold mb-3 bg-green-100/50 dark:bg-green-900/30 w-fit px-2 py-1 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Jawaban Terbaik
            </div>
          )}
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {comment.author}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {comment.points} KP
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {comment.badges.map((badge, i) => (
                  <ForumBadge key={i} text={badge} type={resolveBadgeType(badge)} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">{comment.time}</span>
              <div className="relative">
                <button
                  aria-label="Opsi lainnya"
                  onClick={() => setShowReport(!showReport)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showReport && (
                  <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => {
                        onReport(comment.id, 'comment', comment.content, comment.author)
                        setShowReport(false)
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Flag className="w-3 h-3" /> Laporkan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:bg-slate-800 prose-pre:text-slate-50 prose-pre:rounded-xl">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}
            >
              {comment.content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 ml-2">
          <button
            aria-label={upvoted ? 'Batal upvote komentar' : 'Upvote komentar'}
            onClick={() => setUpvoted(!upvoted)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1',
              upvoted
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <ThumbsUp className={cn('w-4 h-4', upvoted && 'fill-blue-600')} />
            {comment.upvotes + (upvoted ? 1 : 0)}
          </button>
          <button className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            Balas
          </button>
          {isTeacher && !isBestAnswer && depth === 0 && onMarkBest && (
            <button
              onClick={() => onMarkBest(comment.id)}
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <CheckCircle className="w-3 h-3" /> Tandai Terbaik
            </button>
          )}
        </div>

        {comment.replies?.map((reply) => (
          <CommentThread
            key={reply.id}
            comment={reply}
            depth={depth + 1}
            isTeacher={isTeacher}
            onReport={onReport}
          />
        ))}
      </div>
    </div>
  )
}
