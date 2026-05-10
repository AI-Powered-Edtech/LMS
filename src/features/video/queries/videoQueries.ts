import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { STALE } from "@/utils/queryConstants";

import { videoAssetService } from "../api/videoAssetService";
import { videoUploadService } from "../api/videoUploadService";
import type { UploadProgress, VideoAsset } from "../types";
import { videoQueryKeys } from "./videoKeys";

/**
 * Fetch a video asset by block ID.
 * Returns null if no ready asset exists for the given block.
 */
export function useVideoAssetByBlock(
  blockId: string | undefined,
  tenantId: string | null,
) {
  return useQuery({
    queryKey:
      blockId && tenantId
        ? videoQueryKeys.byBlock(tenantId, blockId)
        : ["video-assets", "skip"],
    queryFn: () => videoAssetService.getByBlockId(blockId!, tenantId!),
    enabled: Boolean(blockId && tenantId),
    staleTime: STALE.MODERATE,
  });
}

/**
 * Fetch all video assets for a lesson.
 */
export function useVideoAssetsByLesson(
  lessonId: string | undefined,
  tenantId: string | null,
) {
  return useQuery({
    queryKey:
      lessonId && tenantId
        ? videoQueryKeys.byLesson(tenantId, lessonId)
        : ["video-assets", "skip"],
    queryFn: () => videoAssetService.getByLessonId(lessonId!, tenantId!),
    enabled: Boolean(lessonId && tenantId),
    staleTime: STALE.MODERATE,
  });
}

interface UploadVideoArgs {
  file: File;
  lessonId: string | null;
  blockId: string | null;
  tenantId: string;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Mutation hook for uploading a video.
 * On success, invalidates both block and lesson query caches.
 */
export function useUploadVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      lessonId,
      blockId,
      tenantId,
      onProgress,
    }: UploadVideoArgs) =>
      videoUploadService.uploadVideo(
        file,
        lessonId,
        blockId,
        tenantId,
        onProgress,
      ),
    onSuccess: (data: VideoAsset) => {
      // Invalidate lesson-level cache
      if (data.lesson_id) {
        void queryClient.invalidateQueries({
          queryKey: videoQueryKeys.byLesson(data.tenant_id, data.lesson_id),
        });
      }
      // Invalidate block-level cache
      if (data.block_id) {
        void queryClient.invalidateQueries({
          queryKey: videoQueryKeys.byBlock(data.tenant_id, data.block_id),
        });
      }
    },
  });
}
