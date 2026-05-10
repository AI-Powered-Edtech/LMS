import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { STALE } from "@/utils/queryConstants";

import { peerReviewService } from "../api/peerReviewService";
import type { PeerReviewConfigInsert } from "../types";
import { peerReviewQueryKeys } from "./peerReviewKeys";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch peer review config for an assignment.
 * Stale MODERATE — changes a few times per day at most.
 */
export function usePeerReviewConfig(
  assignmentId: string | null | undefined,
  tenantId: string,
) {
  return useQuery({
    queryKey: peerReviewQueryKeys.byAssignment(tenantId, assignmentId ?? ""),
    queryFn: () =>
      peerReviewService.getConfigByAssignment(assignmentId!, tenantId),
    enabled: !!assignmentId && !!tenantId,
    staleTime: STALE.MODERATE,
  });
}

/**
 * Fetch peer reviews assigned to the current user.
 * Stale DYNAMIC — changes within minutes as reviews are assigned/submitted.
 */
export function useMyPeerReviews(
  userId: string | null | undefined,
  tenantId: string,
) {
  return useQuery({
    queryKey: peerReviewQueryKeys.myReviews(tenantId, userId ?? ""),
    queryFn: () => peerReviewService.getMyReviews(userId!, tenantId),
    enabled: !!userId && !!tenantId,
    staleTime: STALE.DYNAMIC,
  });
}

/**
 * Fetch all reviews for a submission (teacher summary).
 * Stale MODERATE — useful for gradebook-style views.
 */
export function useReviewsBySubmission(
  submissionId: string | null | undefined,
  tenantId: string,
) {
  return useQuery({
    queryKey: peerReviewQueryKeys.bySubmission(tenantId, submissionId ?? ""),
    queryFn: () =>
      peerReviewService.getReviewsBySubmission(submissionId!, tenantId),
    enabled: !!submissionId && !!tenantId,
    staleTime: STALE.MODERATE,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Save (upsert) peer review config for an assignment.
 * Invalidates the byAssignment query after success.
 */
export function useSavePeerReviewConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      config,
      tenantId,
      createdBy,
    }: {
      config: PeerReviewConfigInsert;
      tenantId: string;
      createdBy: string;
    }) => peerReviewService.saveConfig(config, tenantId, createdBy),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: peerReviewQueryKeys.byAssignment(
          data.tenant_id,
          data.assignment_id,
        ),
      });
    },
  });
}

/**
 * Trigger random peer review assignment via RPC.
 * Invalidates config query so status updates to 'in_review'.
 */
export function useAssignReviews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      tenantId: _tenantId,
      assignmentId: _assignmentId,
    }: {
      configId: string;
      tenantId: string;
      assignmentId: string;
    }) => peerReviewService.assignReviews(configId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: peerReviewQueryKeys.byAssignment(
          variables.tenantId,
          variables.assignmentId,
        ),
      });
    },
  });
}

/**
 * Submit a peer review (student action).
 * Invalidates myReviews for the reviewer.
 */
export function useSubmitPeerReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      score,
      comment,
      tenantId,
    }: {
      reviewId: string;
      score: number;
      comment: string;
      tenantId: string;
      userId: string;
    }) => peerReviewService.submitReview(reviewId, score, comment, tenantId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: peerReviewQueryKeys.myReviews(
          variables.tenantId,
          variables.userId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: peerReviewQueryKeys.bySubmission(
          variables.tenantId,
          _data.submission_id,
        ),
      });
    },
  });
}
