import { api } from "@/src/lib/api"
import 'katex/dist/katex.min.css'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ReportModal } from '@/src/components/moderation/ReportModal'
import { EmptyState } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { discussionService } from '@/src/features/discussions/api/discussionService'
import {
  CreatePostForm,
  ForumHeader,
  ForumSearchBar,
  PostItem,
} from '@/src/features/discussions/components/forum'
import { buildForumPosts } from '@/src/features/discussions/utils/forumUtils'
import { useStudentXPProfile } from '@/src/features/gamification/queries/gamificationQueries'
import { useSubmitReport } from '@/src/features/moderation/queries/moderationQueries'
import { useDebounce } from '@/src/hooks/useDebounce'
import { usePageTitle } from '@/src/hooks/usePageTitle'

export function Forum() {
  usePageTitle('Forum')
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

  const posts = useMemo(() => buildForumPosts(rawDiscussions), [rawDiscussions])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [isAnonymous, setIsAnonymous] = useState(false)

  // ⚡ Perf: Debounce search input to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300)

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
      })
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
      setIsAnonymous(false)
    },
  })

  const handleReport = (id: string, type: 'post' | 'comment', snippet: string, author: string) => {
    setReportModal({
      isOpen: true,
      contentId: id,
      contentType: type,
      contentSnippet: snippet,
      contentAuthor: author,
    })
  }

  const handleMarkBestAnswer = async (postId: string, commentId: string) => {
    await discussionService.setBestAnswer(postId, commentId, tenantId!)
    queryClient.invalidateQueries({ queryKey: ['forum-posts', tenantId] })
  }

  // ⚡ Perf: Memoize filteredPosts — was recomputed on every render without useMemo
  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesSearch =
          post.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          post.content.toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchesCategory = selectedCategory === 'Semua' || post.category === selectedCategory
        return matchesSearch && matchesCategory
      }),
    [posts, debouncedSearch, selectedCategory]
  )

  const myAvatar = isAnonymous
    ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anon'
    : (profile?.avatar_url ??
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'user'}`)

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full p-4 md:p-8">
      <ForumHeader knowledgePoints={xpProfile?.total_xp ?? 0} />

      <ForumSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <CreatePostForm
        onSubmit={(data) => createPost.mutate(data)}
        isPending={createPost.isPending}
        avatar={myAvatar}
        isAnonymous={isAnonymous}
        onAnonymousChange={setIsAnonymous}
      />

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
