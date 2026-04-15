import 'katex/dist/katex.min.css'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useMemo, useState } from 'react'

import { ReportModal } from '@/components/moderation/ReportModal'
import { EmptyState } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useClassroom } from '@/features/classroom/hooks/useClassroomQueries'
import { useCourses } from '@/features/courses/queries/courseQueries'
import { discussionService } from '@/features/discussions/api/discussionService'
import {
  CreatePostForm,
  ForumHeader,
  ForumSearchBar,
  PostItem,
} from '@/features/discussions/components/forum'
import { ForumParticipationFilters } from '@/features/discussions/components/forum/ForumParticipationFilters'
import { ForumParticipationTable } from '@/features/discussions/components/forum/ForumParticipationTable'
import { MessageSquare } from '@/icons'
const ParticipationChart = lazy(() =>
  import('@/features/discussions/components/forum/ParticipationChart').then((module) => ({
    default: module.ParticipationChart,
  }))
)
import { useForumParticipationStats } from '@/features/discussions/queries/discussionQueries'
import { buildForumPosts } from '@/features/discussions/utils/forumUtils'
import { exportParticipationToCSV } from '@/features/discussions/utils/participationExport'
import { useStudentXPProfile } from '@/features/gamification/queries/gamificationQueries'
import { useSubmitReport } from '@/features/moderation/queries/moderationQueries'
import { useDebounce } from '@/hooks/useDebounce'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'

export function Forum() {
  usePageTitle('Forum')
  const { activeRole, user, tenantId, profile } = useAuth()
  const queryClient = useQueryClient()
  const submitReport = useSubmitReport()
  const addToast = useToast((s) => s.addToast)
  // SECURITY FIX: Use activeRole (tenant-scoped) instead of global role
  const isTeacher = activeRole === 'teacher'

  const { data: xpProfile } = useStudentXPProfile(user?.id)

  const [forumPage, setForumPage] = useState(0)
  const [activeTab, setActiveTab] = useState<'discussions' | 'participation'>('discussions')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const PAGE_SIZE = 20

  // Course and classroom data for filters
  const { data: coursesData } = useCourses()
  const courses = coursesData?.courses ?? []
  const { classrooms: allClassrooms = [] } = useClassroom()

  // Filter classrooms by selected course
  const availableClassrooms = useMemo(() => {
    if (!selectedCourseId) return []
    return allClassrooms.filter((classroom: any) => classroom.course_id === selectedCourseId)
  }, [allClassrooms, selectedCourseId])

  const { data: rawDiscussions = [] } = useQuery({
    queryKey: ['forum-posts', tenantId, forumPage, selectedCourseId],
    queryFn: () =>
      discussionService.fetchForumPosts(tenantId!, forumPage, PAGE_SIZE, selectedCourseId),
    enabled: !!tenantId,
  })

  const posts = useMemo(() => buildForumPosts(rawDiscussions), [rawDiscussions])

  // Forum participation stats - only for teachers
  const {
    data: participationData,
    isLoading: participationLoading,
    error: participationError,
  } = useForumParticipationStats(selectedCourseId, {
    enabled: isTeacher && activeTab === 'participation' && !!selectedCourseId,
    classId: selectedClassId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

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
        course_id: selectedCourseId || null,
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
      void queryClient.invalidateQueries({ queryKey: ['forum-posts', tenantId] })
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
    void queryClient.invalidateQueries({ queryKey: ['forum-posts', tenantId] })
  }

  const handleVote = async (postId: string) => {
    const result = await discussionService.voteDiscussion(postId)
    if (!result.success) {
      if (result.reason === 'rpc_not_found') {
        addToast({
          type: 'warning',
          message: 'Fitur voting sedang diperbarui',
          description: 'Coba lagi beberapa saat.',
        })
      } else {
        addToast({
          type: 'error',
          message: 'Gagal memberikan suara',
          description: 'Silakan coba lagi.',
        })
      }
    }
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

      {/* Tab Navigation - Only show for teachers */}
      {isTeacher && (
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('discussions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'discussions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Diskusi
          </button>
          <button
            onClick={() => setActiveTab('participation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'participation'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Partisipasi
          </button>
        </div>
      )}

      {activeTab === 'discussions' && (
        <>
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
                  onVote={handleVote}
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

          {/* Pagination: load more / previous */}
          {(forumPage > 0 || rawDiscussions.length === PAGE_SIZE) && (
            <div className="flex items-center justify-center gap-3 pt-2">
              {forumPage > 0 && (
                <button
                  onClick={() => setForumPage((p) => p - 1)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  Sebelumnya
                </button>
              )}
              {rawDiscussions.length === PAGE_SIZE && (
                <button
                  onClick={() => setForumPage((p) => p + 1)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  Muat Lebih Banyak
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'participation' && isTeacher && (
        <div className="space-y-6">
          {/* Course Selector for Participation */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Pilih Kursus
            </h3>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value)
                setSelectedClassId('') // Reset class selection when course changes
              }}
              className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Pilih kursus untuk melihat partisipasi...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filters and Export */}
          {selectedCourseId && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Filter & Export
                </h3>
                <button
                  onClick={() => {
                    const selectedCourse = courses.find((c: any) => c.id === selectedCourseId)
                    const selectedClassroom = availableClassrooms.find(
                      (c: any) => c.id === selectedClassId
                    )
                    exportParticipationToCSV({
                      data: participationData?.participants || [],
                      courseName: selectedCourse?.title,
                      className: selectedClassroom?.name,
                      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
                    })
                  }}
                  disabled={
                    !participationData?.participants || participationData.participants.length === 0
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export CSV
                </button>
              </div>
              <ForumParticipationFilters
                classes={availableClassrooms}
                selectedClass={selectedClassId}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onClassChange={setSelectedClassId}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            </div>
          )}

          {/* Participation Chart */}
          <Suspense fallback={<div className="h-64 animate-pulse">Loading chart...</div>}>
            <ParticipationChart data={participationData?.timeline || []} />
          </Suspense>

          {/* Participation Table */}
          <ForumParticipationTable
            data={participationData?.participants || []}
            isLoading={participationLoading}
            error={participationError?.message}
          />
        </div>
      )}

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
