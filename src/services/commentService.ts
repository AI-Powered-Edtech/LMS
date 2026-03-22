import { supabase } from '../lib/supabase'
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
    const { data, error } = await supabase
      .from('discussion_posts')
      .select(
        'id, content, created_at, author_id, profiles!discussion_posts_author_id_fkey(first_name, last_name)'
      )
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

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
    const { data, error } = await supabase
      .from('discussion_posts')
      .insert({
        thread_id: threadId,
        author_id: authorId,
        content: text,
      })
      .select('id, created_at')
      .single()

    if (error) throw error
    validate(DiscussionPostRowSchema, data, 'commentService.addComment')
    return data
  },
}
