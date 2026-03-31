import {
  BookOpen,
  Code,
  EyeOff,
  Flag,
  GraduationCap,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Tag,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import remarkMath from 'remark-math'

import { OptimizedImage, useToast } from '@/src/components/ui'
import { discussionService } from '@/src/features/discussions/api/discussionService'
import type { ForumPost } from '@/src/features/discussions/types/forum'
import type { ForumComment } from '@/src/features/discussions/types/forum'
import { cn } from '@/src/utils/cn'
import { sanitizeUrl } from '@/src/utils/sanitize'
import { katexSanitizeSchema } from '@/src/utils/sanitizeMarkdown'

import { CommentThread } from './CommentThread'
import { ForumBadge, resolveBadgeType } from './ForumBadge'

interface PostItemProps {
  post: ForumPost
  isTeacher: boolean
  onMarkBest: (postId: string, commentId: string) => void
  onReport: (id: string, type: 'post' | 'comment', snippet: string, author: string) => void
}

export function PostItem({ post, isTeacher, onMarkBest, onReport }: PostItemProps) {
  const addToast = useToast((s: any) => s.addToast)
  const [upvoted, setUpvoted] = useState(false)
  const [downvoted, setDownvoted] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleUpvote = () => {
    if (upvoted) {
      setUpvoted(false)
    } else {
      setUpvoted(true)
      setDownvoted(false)
      discussionService.voteDiscussion(post.id).then(
        () => null,
        () => null
      )
    }
  }

  const handleDownvote = () => {
    if (downvoted) {
      setDownvoted(false)
    } else {
      setDownvoted(true)
      setUpvoted(false)
    }
  }

  const currentUpvotes = post.upvotes + (upvoted ? 1 : 0) - (downvoted ? 1 : 0)

  const sortedComments = [...post.comments].sort((a, b) => {
    if (a.id === post.bestAnswerId) return -1
    if (b.id === post.bestAnswerId) return 1
    return b.upvotes - a.upvotes
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <div className="p-4 md:p-6 flex gap-4 md:gap-6">
        {/* Upvote Column */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={handleUpvote}
            aria-label="Suka postingan"
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              upvoted
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-blue-900/20'
            )}
          >
            <ThumbsUp className={cn('w-5 h-5', upvoted && 'fill-blue-600')} />
          </button>
          <span
            className={cn(
              'font-bold',
              upvoted
                ? 'text-blue-600'
                : downvoted
                  ? 'text-red-600'
                  : 'text-slate-700 dark:text-slate-300'
            )}
          >
            {currentUpvotes}
          </span>
          <button
            onClick={handleDownvote}
            aria-label="Tidak suka postingan"
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              downvoted
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                : 'hover:bg-red-50 text-slate-400 hover:text-red-600 dark:hover:bg-red-900/20'
            )}
          >
            <ThumbsDown className={cn('w-5 h-5', downvoted && 'fill-red-600')} />
          </button>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <OptimizedImage
                src={post.avatar}
                alt={`Foto profil ${post.author}`}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {post.author}
                  </span>
                  {post.isAnonymous && isTeacher && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Posting Anonim
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> {post.points} KP
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {post.badges.map((badge, i) => (
                    <ForumBadge key={i} text={badge} type={resolveBadgeType(badge)} />
                  ))}
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">{post.time}</span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Menu postingan"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-10">
                  {isTeacher && (
                    <button
                      onClick={() => addToast({ type: 'info', message: 'Segera hadir' })}
                      className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700"
                    >
                      <Share2 className="w-4 h-4" /> Push ke GCR
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onReport(post.id, 'post', post.content, post.author)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" /> Laporkan Postingan
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {post.category}
            </span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1"
              >
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {post.title}
          </h2>

          {post.contextLink && (
            <a
              href={sanitizeUrl(post.contextLink.url)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg text-sm font-medium mb-4 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800"
            >
              <Code className="w-4 h-4" />
              Konteks: {post.contextLink.title}
            </a>
          )}

          <div className="prose prose-slate dark:prose-invert max-w-none mb-4 prose-pre:bg-slate-800 prose-pre:text-slate-50 prose-pre:rounded-xl">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          <div className="flex items-center gap-6 border-t border-slate-100 dark:border-slate-700 pt-4">
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              <MessageSquare className="w-5 h-5" />
              {post.comments.length} Diskusi
            </button>
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              <Share2 className="w-5 h-5" />
              Bagikan
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {sortedComments.length > 0 && (
        <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-6 border-t border-slate-200 dark:border-slate-700 space-y-6">
          {sortedComments.map((comment: ForumComment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              isBestAnswer={comment.id === post.bestAnswerId}
              isTeacher={isTeacher}
              onMarkBest={(commentId) => onMarkBest(post.id, commentId)}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
