import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'
import { CommentData, commentService } from '@/src/features/discussions/api/commentService'
import { createQueryKeys } from '@/src/lib/queryKeys'

type Comment = CommentData

const base = createQueryKeys('comments')
const commentKeys = {
  ...base,
  thread: (tenantId: string, threadId: string) => [...base.all(tenantId), threadId] as const,
}

function useAddComment() {
  const { user, profile, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ threadId, text }: { threadId: string; text: string }) => {
      if (!user) throw new Error('Not authenticated')
      return commentService.addComment(threadId, user.id, text)
    },
    onSuccess: (data, { threadId, text }) => {
      if (!tenantId) return
      // Optimistic-style: append to cache
      const authorName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'You'
      queryClient.setQueryData<Comment[]>(commentKeys.thread(tenantId, threadId), (old) => [
        ...(old ?? []),
        {
          id: data.id,
          author: authorName,
          text,
          time: new Date(data.created_at).toLocaleString('id-ID'),
          author_id: user!.id,
        },
      ])
    },
  })
}

/**
 * Drop-in replacement for the old CommentContext useComments() hook.
 * Provides the same API surface so consumers need minimal changes.
 */
export function useComments() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const addCommentMutation = useAddComment()

  const addComment = async (threadId: string, text: string) => {
    await addCommentMutation.mutateAsync({ threadId, text })
  }

  const getComments = (threadId: string): Comment[] => {
    if (!tenantId) return []
    return queryClient.getQueryData<Comment[]>(commentKeys.thread(tenantId, threadId)) ?? []
  }

  const setInitialComments = (
    assignmentId: string,
    studentId: string,
    initialComments: Comment[]
  ) => {
    if (!tenantId) return
    const key = `${assignmentId}-${studentId}`
    queryClient.setQueryData(commentKeys.thread(tenantId, key), initialComments)
  }

  const refreshComments = async (threadId: string) => {
    if (!tenantId) return
    await queryClient.invalidateQueries({ queryKey: commentKeys.thread(tenantId, threadId) })
  }

  return {
    loading: addCommentMutation.isPending,
    addComment,
    getComments,
    setInitialComments,
    refreshComments,
  }
}
