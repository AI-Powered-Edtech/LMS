import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { CommentData } from "@/features/discussions/api/commentService";
import { createQueryKeys } from "@/shared/lib/queryKeys";

type Comment = CommentData;

const base = createQueryKeys("comments");
const commentKeys = {
  ...base,
  thread: (tenantId: string, threadId: string) =>
    [...base.all(tenantId), threadId] as const,
};

function useAddComment() {
  return useMutation({
    mutationFn: async (_params: { threadId: string; text: string }) => {
      // DB doesn't support assignment comments yet
      throw new Error("NOT_IMPLEMENTED");
    },
    onError: () => {
      useToast.getState().addToast({
        type: "info",
        message: "Fitur komentar tugas sedang dalam pengembangan.",
      });
    },
  });
}

/**
 * Drop-in replacement for the old CommentContext useComments() hook.
 * Provides the same API surface so consumers need minimal changes.
 */
export function useComments() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const addCommentMutation = useAddComment();

  const addComment = async (threadId: string, text: string) => {
    await addCommentMutation.mutateAsync({ threadId, text });
  };

  const getComments = (threadId: string): Comment[] => {
    if (!tenantId) return [];
    return (
      queryClient.getQueryData<Comment[]>(
        commentKeys.thread(tenantId, threadId),
      ) ?? []
    );
  };

  const setInitialComments = (
    assignmentId: string,
    studentId: string,
    initialComments: Comment[],
  ) => {
    if (!tenantId) return;
    const key = `${assignmentId}-${studentId}`;
    queryClient.setQueryData(
      commentKeys.thread(tenantId, key),
      initialComments,
    );
  };

  const refreshComments = async (threadId: string) => {
    if (!tenantId) return;
    await queryClient.invalidateQueries({
      queryKey: commentKeys.thread(tenantId, threadId),
    });
  };

  return {
    loading: addCommentMutation.isPending,
    addComment,
    getComments,
    setInitialComments,
    refreshComments,
  };
}
