import { supabase } from '@/src/services/supabase/client'
import { logger } from '@/src/utils/logger'

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
const DISCUSSION_COLUMNS = `
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
    let query = supabase
      .from('discussions')
      .select(DISCUSSION_COLUMNS)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true })

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
      if (import.meta.env.DEV) logger.error('Error fetching discussions:', error)
      throw error
    }

    return data as unknown as Discussion[]
  },

  /**
   * Save (create or update) a discussion entry
   */
  async saveDiscussion(
    discussion: Partial<Discussion> & { tenant_id: string; author_id: string; content: string }
  ) {
    const { data, error } = await supabase
      .from('discussions')
      .upsert(discussion)
      .select(DISCUSSION_COLUMNS)
      .single()

    if (error) {
      if (import.meta.env.DEV) logger.error('Error saving discussion:', error)
      throw error
    }

    return data as unknown as Discussion
  },

  /**
   * Soft delete a discussion entry (preserves thread integrity)
   */
  async deleteDiscussion(id: string, tenantId: string) {
    const { error } = await supabase
      .from('discussions')
      .update({
        is_deleted: true,
        content: '[Komentar ini telah dihapus]',
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      if (import.meta.env.DEV) logger.error('Error deleting discussion:', error)
      throw error
    }
  },

  /**
   * Toggle the pinned status of a discussion
   */
  async togglePin(id: string, is_pinned: boolean, tenantId: string) {
    const { error } = await supabase
      .from('discussions')
      .update({ is_pinned })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      if (import.meta.env.DEV) logger.error('Error toggling pin status:', error)
      throw error
    }
  },

  /**
   * Fetch top-level forum posts (no lesson/course/announcement context)
   */
  async fetchForumPosts(tenantId: string): Promise<Discussion[]> {
    const { data, error } = await supabase
      .from('discussions')
      .select(DISCUSSION_COLUMNS)
      .eq('tenant_id', tenantId)
      .is('lesson_id', null)
      .is('course_id', null)
      .is('announcement_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Discussion[]
  },

  /**
   * Vote on a discussion post (fire-and-forget).
   */
  async voteDiscussion(discussionId: string): Promise<void> {
    await supabase.rpc('vote_discussion', { p_discussion_id: discussionId })
  },

  /**
   * Mark a comment as the best answer for a post.
   */
  async setBestAnswer(postId: string, commentId: string, tenantId: string): Promise<void> {
    await supabase
      .from('discussions')
      .update({ is_best_answer: false })
      .eq('parent_id', postId)
      .eq('tenant_id', tenantId)
    await supabase
      .from('discussions')
      .update({ is_best_answer: true })
      .eq('id', commentId)
      .eq('tenant_id', tenantId)
  },
}
