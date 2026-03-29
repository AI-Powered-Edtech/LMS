import { supabase } from '@/src/services/supabase/client'
import { validate } from '@/src/shared/lib/validate'
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
  async fetchComments(_threadId: string): Promise<CommentData[]> {
    // Fake implementation since DB doesn't support assignment comments yet
    return []
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
