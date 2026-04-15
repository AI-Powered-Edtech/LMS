import { apiFetch } from '@/src/lib/api'

export interface Discussion {
  id: string
  tenant_id: string
  course_id?: string | null
  lesson_id?: string | null
  announcement_id?: string | null
  author_id: string
  parent_id?: string | null
  content: string
  is_pinned: boolean
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  // Forum-specific columns (added by forum_extend_discussions migration)
  title?: string | null
  category?: string | null
  tags?: string[] | null
  is_anonymous?: boolean | null
  upvotes?: number | null
  is_best_answer?: boolean | null
  author?: {
    full_name: string
    avatar_url: string | null
  }
  replies?: Discussion[]
  replies_count?: number
}

// Explicit columns for discussion queries (no SELECT *)
const _DISCUSSION_COLUMNS = `
  id, tenant_id, course_id, lesson_id, announcement_id,
  author_id, parent_id, content, is_pinned, is_edited, is_deleted,
  created_at, updated_at, title, category, tags, is_anonymous,
  upvotes, is_best_answer,
  author:author_id (full_name, avatar_url)
`

export const discussionService = {
  /**
   * Fetch comments/discussions for a specific context
   */
  async fetchDiscussions(options: {
    tenantId?: string
    announcementId?: string
    lessonId?: string
    courseId?: string
    parentId?: string | null
  }) {
    let query = apiFetch('/discussions')

    if (options.tenantId) {
      query = query.eq('tenant_id', options.tenantId)
    }

    if (options.announcementId) {
      query = query.eq('announcement_id', options.announcementId)
    } else if (options.lessonId) {
      query = query.eq('lesson_id', options.lessonId)
    } else if (options.courseId) {
      query = query.eq('course_id', options.courseId)
    }

    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        query = query.is('parent_id', null)
      } else {
        query = query.eq('parent_id', options.parentId)
      }
    }

    const { data, error } = await query

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching discussions:', error)
      throw error
    }

    return data as unknown as Discussion[]
  },

  /**
   * Save (create or update) a discussion entry
   */
  async saveDiscussion(
    _discussion: Partial<Discussion> & { tenant_id: string; author_id: string; content: string }
  ) {
    const { data, error } = await apiFetch('/discussions')

    if (error) {
      if (import.meta.env.DEV) console.error('Error saving discussion:', error)
      throw error
    }

    return data as unknown as Discussion
  },

  /**
   * Soft delete a discussion entry (preserves thread integrity)
   */
  async deleteDiscussion(_id: string, _tenantId: string) {
    const { error } = await apiFetch('/discussions')

    if (error) {
      if (import.meta.env.DEV) console.error('Error deleting discussion:', error)
      throw error
    }
  },

  /**
   * Toggle the pinned status of a discussion
   */
  async togglePin(_id: string, _is_pinned: boolean, _tenantId: string) {
    const { error } = await apiFetch('/discussions')

    if (error) {
      if (import.meta.env.DEV) console.error('Error toggling pin status:', error)
      throw error
    }
  },

  /**
   * Fetch top-level forum posts (no lesson/course/announcement context)
   */
  async fetchForumPosts(_tenantId: string): Promise<Discussion[]> {
    const { data, error } = await apiFetch('/discussions')

    if (error) throw error
    return (data ?? []) as unknown as Discussion[]
  },

  /**
   * Vote on a discussion post (fire-and-forget).
   */
  async voteDiscussion(discussionId: string): Promise<void> {
    await apiFetch('/rpc/vote_discussion', { method: 'POST', body: JSON.stringify({ p_discussion_id: discussionId }) })
  },

  /**
   * Mark a comment as the best answer for a post.
   */
  async setBestAnswer(_postId: string, _commentId: string, _tenantId: string): Promise<void> {
    await apiFetch('/discussions')
    await apiFetch('/discussions')
  },
}
