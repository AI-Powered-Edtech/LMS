import { useState, useMemo } from 'react'
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreHorizontal,
  Send,
  Search,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Award,
  EyeOff,
  Tag,
  BookOpen,
  Code,
  Flag,
  GraduationCap,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { cn } from '@/src/utils/cn'
import { motion, AnimatePresence } from 'motion/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'
import { useSubmitReport } from '@/src/features/moderation/queries/moderationQueries'
import { ReportModal } from '@/src/components/moderation/ReportModal'
import { EmptyState } from '@/src/components/ui'
import {
  discussionService,
  type Discussion,
} from '@/src/features/discussions/api/discussionService'
import { useStudentXPProfile } from '@/src/features/gamification/queries/gamificationQueries'

interface Comment {
  id: string
  author: string
  avatar: string
  role: string
  points: number
  badges: string[]
  content: string
  upvotes: number
  time: string
  isBestAnswer?: boolean
  replies?: Comment[]
}

interface Post {
  id: string
  author: string
  avatar: string
  role: string
  points: number
  badges: string[]
  time: string
  title: string
  content: string
  category: string
  tags: string[]
  upvotes: number
  isAnonymous: boolean
  contextLink?: { title: string; url: string }
  bestAnswerId?: string
  comments: Comment[]
}

const CATEGORIES = ['Semua', 'Matematika', 'Fisika', 'Kimia', 'Biologi', 'Pemrograman', 'Umum']

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'Baru saja'
  if (s < 3600) return `${Math.floor(s / 60)} menit yang lalu`
  if (s < 86400) return `${Math.floor(s / 3600)} jam yang lalu`
  return `${Math.floor(s / 86400)} hari yang lalu`
}

function mapToPost(d: Discussion, repliesMap: Record<string, Discussion[]>): Post {
  const isAnon = d.is_anonymous ?? false
  const replies = (repliesMap[d.id] ?? []).sort(
    (a, b) =>
      (b.is_best_answer ? 1 : 0) - (a.is_best_answer ? 1 : 0) || (b.upvotes ?? 0) - (a.upvotes ?? 0)
  )
  const bestReply = replies.find((r) => r.is_best_answer)

  return {
    id: d.id,
    author: isAnon ? 'Anonim' : (d.author?.full_name ?? 'Pengguna'),
    avatar: isAnon
      ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anon'
      : (d.author?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.author_id}`),
    role: 'Siswa',
    points: 0,
    badges: [],
    time: timeAgo(d.created_at),
    title: d.title ?? '(Tanpa judul)',
    content: d.content,
    category: d.category ?? 'Umum',
    tags: d.tags ?? [],
    upvotes: d.upvotes ?? 0,
    isAnonymous: isAnon,
    bestAnswerId: bestReply?.id,
    comments: replies.map((r) => ({
      id: r.id,
      author: r.is_anonymous ? 'Anonim' : (r.author?.full_name ?? 'Pengguna'),
      avatar:
        r.author?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.author_id}`,
      role: 'Siswa',
      points: 0,
      badges: [],
      content: r.content,
      upvotes: r.upvotes ?? 0,
      time: timeAgo(r.created_at),
      isBestAnswer: r.is_best_answer ?? false,
    })),
  }
}

function Badge({ text, type }: { text: string; type: 'teacher' | 'subject' | 'general' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider',
        type === 'teacher'
          ? 'bg-purple-100 text-purple-700 border border-purple-200'
          : type === 'subject'
            ? 'bg-amber-100 text-amber-700 border border-amber-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200'
      )}
    >
      {type === 'teacher' && <ShieldCheck className="w-3 h-3" />}
      {type === 'subject' && <Award className="w-3 h-3" />}
      {text}
    </span>
  )
}

function CommentThread({
  comment,
  depth = 0,
  isBestAnswer = false,
  onMarkBest,
  isTeacher,
  onReport,
}: {
  comment: Comment
  depth?: number
  isBestAnswer?: boolean
  onMarkBest?: (id: string) => void
  isTeacher: boolean
  onReport: (id: string, type: 'comment', snippet: string, author: string) => void
}) {
  const [upvoted, setUpvoted] = useState(false)
  const [showReport, setShowReport] = useState(false)

  return (
    <div className={cn('flex gap-3', depth > 0 && 'ml-6 md:ml-12 mt-4')}>
      <div className="flex flex-col items-center">
        <img
          src={comment.avatar}
          alt=""
          className={cn('rounded-full bg-slate-100', depth === 0 ? 'w-10 h-10' : 'w-8 h-8')}
        />
        {comment.replies && comment.replies.length > 0 && (
          <div className="w-0.5 flex-1 bg-slate-200 my-2 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'p-4 rounded-2xl rounded-tl-none border transition-all',
            isBestAnswer ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-slate-50 border-slate-100'
          )}
        >
          {isBestAnswer && (
            <div className="flex items-center gap-1.5 text-green-700 text-xs font-bold mb-3 bg-green-100/50 w-fit px-2 py-1 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Jawaban Terbaik
            </div>
          )}
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-slate-800 text-sm">{comment.author}</span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {comment.points} KP
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {comment.badges.map((badge, i) => (
                  <Badge
                    key={i}
                    text={badge}
                    type={
                      badge.includes('Teacher')
                        ? 'teacher'
                        : badge.includes('Master')
                          ? 'subject'
                          : 'general'
                    }
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{comment.time}</span>
              <div className="relative">
                <button
                  onClick={() => setShowReport(!showReport)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showReport && (
                  <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => {
                        onReport(comment.id, 'comment', comment.content, comment.author)
                        setShowReport(false)
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Flag className="w-3 h-3" /> Laporkan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-slate-700 text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-slate-800 prose-pre:text-slate-50 prose-pre:rounded-xl">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {comment.content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 ml-2">
          <button
            onClick={() => setUpvoted(!upvoted)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium transition-colors',
              upvoted ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <ThumbsUp className={cn('w-4 h-4', upvoted && 'fill-blue-600')} />
            {comment.upvotes + (upvoted ? 1 : 0)}
          </button>
          <button className="text-xs font-medium text-slate-500 hover:text-slate-700">Balas</button>
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

function PostItem({
  post,
  isTeacher,
  onMarkBest,
  onReport,
}: {
  post: Post
  isTeacher: boolean
  onMarkBest: (postId: string, commentId: string) => void
  onReport: (id: string, type: 'post' | 'comment', snippet: string, author: string) => void
}) {
  const [upvoted, setUpvoted] = useState(false)
  const [downvoted, setDownvoted] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleUpvote = () => {
    if (upvoted) {
      setUpvoted(false)
    } else {
      setUpvoted(true)
      setDownvoted(false)
      // Fire and forget vote RPC
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
      className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 md:p-6 flex gap-4 md:gap-6">
        {/* Upvote Column */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={handleUpvote}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              upvoted
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600'
            )}
          >
            <ThumbsUp className={cn('w-5 h-5', upvoted && 'fill-blue-600')} />
          </button>
          <span
            className={cn(
              'font-bold',
              upvoted ? 'text-blue-600' : downvoted ? 'text-red-600' : 'text-slate-700'
            )}
          >
            {currentUpvotes}
          </span>
          <button
            onClick={handleDownvote}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              downvoted
                ? 'bg-red-100 text-red-600'
                : 'hover:bg-red-50 text-slate-400 hover:text-red-600'
            )}
          >
            <ThumbsDown className={cn('w-5 h-5', downvoted && 'fill-red-600')} />
          </button>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <img src={post.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-100" />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900">{post.author}</span>
                  {post.isAnonymous && isTeacher && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Posting Anonim
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> {post.points} KP
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {post.badges.map((badge, i) => (
                    <Badge
                      key={i}
                      text={badge}
                      type={
                        badge.includes('Teacher')
                          ? 'teacher'
                          : badge.includes('Master')
                            ? 'subject'
                            : 'general'
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-500">{post.time}</span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-slate-400 hover:text-slate-600"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
                  {isTeacher && (
                    <button className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-slate-100">
                      <Share2 className="w-4 h-4" /> Push ke GCR
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onReport(post.id, 'post', post.content, post.author)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" /> Laporkan Postingan
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {post.category}
            </span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1"
              >
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">{post.title}</h2>

          {post.contextLink && (
            <a
              href={post.contextLink.url}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium mb-4 hover:bg-indigo-100 transition-colors border border-indigo-100"
            >
              <Code className="w-4 h-4" />
              Konteks: {post.contextLink.title}
            </a>
          )}

          <div className="prose prose-slate max-w-none mb-4 prose-pre:bg-slate-800 prose-pre:text-slate-50 prose-pre:rounded-xl">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {post.content}
            </ReactMarkdown>
          </div>

          <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium transition-colors">
              <MessageSquare className="w-5 h-5" />
              {post.comments.length} Diskusi
            </button>
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium transition-colors">
              <Share2 className="w-5 h-5" />
              Bagikan
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {sortedComments.length > 0 && (
        <div className="bg-slate-50/50 p-4 md:p-6 border-t border-slate-200 space-y-6">
          {sortedComments.map((comment: Comment) => (
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

export function Forum() {
  const { role, user, tenantId, profile } = useAuth()
  const queryClient = useQueryClient()
  const submitReport = useSubmitReport()
  const isTeacher = role === 'teacher'

  const { data: xpProfile } = useStudentXPProfile(user?.id)

  const { data: rawDiscussions = [] } = useQuery({
    queryKey: ['forum-posts', tenantId],
    queryFn: () => discussionService.fetchForumPosts(tenantId!),
    enabled: !!tenantId,
  })

  const posts = useMemo(() => {
    const topLevel = rawDiscussions.filter((d) => !d.parent_id)
    const repliesMap: Record<string, Discussion[]> = {}
    rawDiscussions
      .filter((d) => !!d.parent_id)
      .forEach((r) => {
        const pid = r.parent_id!
        if (!repliesMap[pid]) repliesMap[pid] = []
        repliesMap[pid].push(r)
      })
    return topLevel.map((d) => mapToPost(d, repliesMap))
  }, [rawDiscussions])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')

  const [reportModal, setReportModal] = useState<{
    isOpen: boolean
    contentId: string
    contentType: 'post' | 'comment'
    contentSnippet?: string
    contentAuthor?: string
  }>({
    isOpen: false,
    contentId: '',
    contentType: 'post',
  })

  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostCategory, setNewPostCategory] = useState('Umum')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [profanityWarning, setProfanityWarning] = useState(false)

  const checkProfanity = (text: string) => {
    const badWords = ['bodoh', 'goblok', 'tolol', 'anjing']
    return badWords.some((word) => text.toLowerCase().includes(word))
  }

  const handleReport = (id: string, type: 'post' | 'comment', snippet: string, author: string) => {
    setReportModal({
      isOpen: true,
      contentId: id,
      contentType: type,
      contentSnippet: snippet,
      contentAuthor: author,
    })
  }

  const createPost = useMutation({
    mutationFn: async (vars: {
      title: string
      content: string
      category: string
      isAnon: boolean
    }) => {
      if (!user || !tenantId) throw new Error('Not authenticated')
      return discussionService.saveDiscussion({
        tenant_id: tenantId,
        author_id: user.id,
        content: vars.content,
        title: vars.title,
        category: vars.category,
        is_anonymous: vars.isAnon,
        is_pinned: false,
        is_edited: false,
        is_deleted: false,
      } as any)
    },
    onSuccess: (data, vars) => {
      const isAiSuspect =
        vars.content.length > 200 &&
        (vars.content.includes('tentu') || vars.content.includes('sebagai model bahasa'))
      if (isAiSuspect) {
        const authorName = vars.isAnon ? 'Anonim' : (profile?.first_name ?? 'Pengguna')
        submitReport.mutate({
          contentId: data.id,
          contentType: 'post',
          reason: 'ai_generated',
          description:
            'Terdeteksi otomatis oleh sistem AI Shield sebagai konten yang berpotensi dibuat oleh AI.',
          contentSnippet: vars.content.substring(0, 100) + '...',
          contentAuthor: authorName,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['forum-posts', tenantId] })
      setNewPostTitle('')
      setNewPostContent('')
      setIsAnonymous(false)
    },
  })

  const handlePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return

    if (checkProfanity(newPostTitle) || checkProfanity(newPostContent)) {
      setProfanityWarning(true)
      setTimeout(() => setProfanityWarning(false), 3000)
      return
    }

    createPost.mutate({
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory,
      isAnon: isAnonymous,
    })
  }

  const handleMarkBestAnswer = async (postId: string, commentId: string) => {
    await discussionService.setBestAnswer(postId, commentId)
    queryClient.invalidateQueries({ queryKey: ['forum-posts', tenantId] })
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'Semua' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const myAvatar = isAnonymous
    ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anon'
    : (profile?.avatar_url ??
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'user'}`)

  const myKP = xpProfile?.total_xp ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Ruang Diskusi
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-bold">
              Beta
            </span>
          </h1>
          <p className="text-slate-500 mt-2">
            Tanya, jawab, dan belajar bersama komunitas. Dapatkan Knowledge Points (KP)!
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-center px-4 border-r border-slate-100">
            <div className="text-2xl font-black text-blue-600">{myKP}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              KP Saya
            </div>
          </div>
          <div className="px-2">
            <Badge text="Aktif" type="general" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pertanyaan atau kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all',
                selectedCategory === cat
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div className="flex gap-4">
          <img
            src={myAvatar}
            alt=""
            className="w-10 h-10 rounded-full bg-slate-100 shrink-0 hidden sm:block"
          />
          <div className="flex-1 space-y-4">
            <div>
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Judul pertanyaan..."
                className="w-full bg-transparent border-b border-slate-200 pb-2 text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
              />
            </div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Jelaskan pertanyaanmu secara detail... (Mendukung Markdown & LaTeX: $$x^2$$)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-y"
            />

            <AnimatePresence>
              {profanityWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-200"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Pesan Anda mengandung kata-kata yang tidak pantas. Harap gunakan bahasa yang
                  sopan.
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {CATEGORIES.filter((c) => c !== 'Semua').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <EyeOff className="w-4 h-4" /> Tanya Anonim
                </label>
              </div>

              <button
                onClick={handlePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || createPost.isPending}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
                {createPost.isPending ? 'Memposting...' : 'Posting Pertanyaan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              isTeacher={isTeacher}
              onMarkBest={handleMarkBestAnswer}
              onReport={handleReport}
            />
          ))
        ) : (
          <EmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title="Belum ada diskusi"
            description="Jadilah yang pertama membuka diskusi di forum ini."
          />
        )}
      </div>

      <ReportModal
        isOpen={reportModal.isOpen}
        onClose={() => setReportModal((prev) => ({ ...prev, isOpen: false }))}
        contentId={reportModal.contentId}
        contentType={reportModal.contentType}
        contentSnippet={reportModal.contentSnippet}
        contentAuthor={reportModal.contentAuthor}
      />
    </div>
  )
}
