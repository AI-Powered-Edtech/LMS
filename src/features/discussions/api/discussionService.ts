import { supabase } from '@/services/supabase/client'

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
  // Phase 36B: Forum Gamification columns
  upvote_count?: number | null
  is_accepted_answer?: boolean | null
  author?: {
    full_name: string
    avatar_url: string | null
  }
  replies?: Discussion[]
  replies_count?: number
}

// Explicit columns for discussion queries (no SELECT *)
// Phase 36B adds: upvote_count, is_accepted_answer
const DISCUSSION_COLUMNS = `
  id, tenant_id, course_id, lesson_id, announcement_id,
  author_id, parent_id, content, is_pinned, is_edited, is_deleted,
  created_at, updated_at, title, category, tags, is_anonymous,
  upvotes, is_best_answer, upvote_count, is_accepted_answer,
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
      if (import.meta.env.DEV) console.error('Error fetching discussions:', error)
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
      if (import.meta.env.DEV) console.error('Error saving discussion:', error)
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
      if (import.meta.env.DEV) console.error('Error deleting discussion:', error)
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
      if (import.meta.env.DEV) console.error('Error toggling pin status:', error)
      throw error
    }
  },

  /**
   * Fetch top-level forum posts (no lesson/course/announcement context)
   * Supports pagination via page/pageSize parameters.
   */
  async fetchForumPosts(
    tenantId: string,
    page: number = 0,
    pageSize: number = 20
  ): Promise<Discussion[]> {
    const { data, error } = await supabase
      .from('discussions')
      .select(DISCUSSION_COLUMNS)
      .eq('tenant_id', tenantId)
      .is('lesson_id', null)
      .is('course_id', null)
      .is('announcement_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    return (data ?? []) as unknown as Discussion[]
  },

  /**
   * Vote on a discussion post via secure RPC (deduplication + self-vote prevention).
   * Returns false if vote was rejected (already voted or self-vote).
   */
  async voteDiscussion(discussionId: string): Promise<{ success: boolean; reason?: string }> {
    const { data, error } = await supabase.rpc('vote_discussion_secure', {
      p_discussion_id: discussionId,
    })
    if (error) {
      // PGRST202 = RPC not deployed yet — degrade gracefully until migration runs.
      if (error.code === 'PGRST202') {
        if (import.meta.env.DEV)
          console.warn(
            '[discussionService] vote_discussion_secure RPC not found — migration needed.'
          )
        return { success: false, reason: 'rpc_not_found' }
      }
      if (import.meta.env.DEV) console.error('Error voting on discussion:', error)
      throw error
    }
    const result = data as { success: boolean; reason?: string } | null
    return result ?? { success: false, reason: 'unknown' }
  },

  // ────────────────────────────────────────────────────────────
  // Phase 36B: Forum Gamification — Votes & Accepted Answers
  // ────────────────────────────────────────────────────────────

  /**
   * Toggle an upvote/downvote on a discussion post via the toggle_post_vote RPC.
   * Self-voting is prevented server-side. Returns the action performed.
   */
  async togglePostVote(
    postId: string,
    voteType: 'upvote' | 'downvote' = 'upvote'
  ): Promise<{ action: 'added' | 'removed' | 'changed'; post_id: string }> {
    const { data, error } = await supabase.rpc('toggle_post_vote', {
      p_post_id: postId,
      p_vote_type: voteType,
    })
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') {
        if (import.meta.env.DEV)
          console.warn('[discussionService] toggle_post_vote RPC not found — migration needed.')
        return { action: 'removed', post_id: postId }
      }
      throw error
    }
    return data as { action: 'added' | 'removed' | 'changed'; post_id: string }
  },

  /**
   * Fetch the current user's vote on a specific post.
   * Returns null if the user has not voted.
   */
  async getUserVote(
    postId: string,
    userId: string,
    tenantId: string
  ): Promise<{ vote_type: 'upvote' | 'downvote' } | null> {
    const { data, error } = await supabase
      .from('discussion_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      if (error.code === '42P01') return null // table not yet created
      throw error
    }
    return data as { vote_type: 'upvote' | 'downvote' } | null
  },

  /**
   * Accept a discussion reply as the best answer (teacher/admin only).
   * Uses the accept_discussion_answer RPC which un-accepts all other answers
   * in the thread atomically.
   */
  async acceptDiscussionAnswer(postId: string): Promise<void> {
    const { error } = await supabase.rpc('accept_discussion_answer', {
      p_post_id: postId,
    })
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') {
        if (import.meta.env.DEV)
          console.warn(
            '[discussionService] accept_discussion_answer RPC not found — migration needed.'
          )
        return
      }
      throw error
    }
  },

  /**
   * Mark a comment as the best answer for a post.
   * FIXED: Pre-verifies tenant ownership before calling RPC to prevent
   * cross-tenant data modification if RLS is misconfigured.
   * Uses set_best_answer RPC for atomic execution (prevents race condition).
   */
  async setBestAnswer(postId: string, commentId: string, tenantId: string): Promise<void> {
    // FIXED: Pre-verify tenant ownership before calling RPC.
    // Ensures the discussion post belongs to this tenant — prevents cross-tenant writes.
    const { data: post, error: postError } = await supabase
      .from('discussions')
      .select('id')
      .eq('id', postId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (postError) {
      if (import.meta.env.DEV)
        console.error('[discussionService] setBestAnswer pre-verify error:', postError)
      throw postError
    }
    if (!post) {
      throw new Error('Post tidak ditemukan atau tidak ada akses ke tenant ini.')
    }

    const { error } = await supabase.rpc('set_best_answer', {
      p_discussion_id: postId,
      p_answer_id: commentId,
    })
    if (error) {
      // PGRST202 = RPC not deployed yet — degrade gracefully until migration runs.
      if (error.code === 'PGRST202') {
        if (import.meta.env.DEV)
          console.warn('[discussionService] set_best_answer RPC not found — migration needed.')
        return
      }
      if (import.meta.env.DEV) console.error('Error setting best answer:', error)
      throw error
    }
  },
}
