import { apiFetch } from '@/src/lib/api'
import { validate, validateArray } from '@/src/shared/lib/validate'
import { DiscussionPostRowSchema } from '@/src/shared/schemas'

export interface CommentData {
  id: string
  author: string
  text: string
  time: string
  author_id?: string
}

export const commentService = {
  /**
   * Fetch comments for a discussion thread, including author profile names.
   */
  async fetchComments(threadId: string): Promise<CommentData[]> {
    const { data, error } = await apiFetch('/discussion_posts')

    if (error) throw error
    validateArray(DiscussionPostRowSchema, data ?? [], 'commentService.fetchComments')

    return (data ?? []).map((d) => ({
      id: d.id,
      author:
        `${(d as unknown as { profiles?: { first_name?: string; last_name?: string } }).profiles?.first_name ?? ''} ${(d as unknown as { profiles?: { first_name?: string; last_name?: string } }).profiles?.last_name ?? ''}`.trim() ||
        'Unknown',
      text: d.content,
      time: new Date(d.created_at).toLocaleString('id-ID'),
      author_id: d.author_id,
    }))
  },

  /**
   * Add a new comment to a discussion thread.
   * Returns the created comment data.
   */
  async addComment(
    threadId: string,
    authorId: string,
    text: string
  ): Promise<{ id: string; created_at: string }> {
    const { data, error } = await apiFetch('/discussion_posts')

    if (error) throw error
    validate(DiscussionPostRowSchema, data, 'commentService.addComment')
    return data
  },
}
