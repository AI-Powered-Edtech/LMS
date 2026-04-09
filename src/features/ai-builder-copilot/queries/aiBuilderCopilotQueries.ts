import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { GC, STALE } from '@/utils/queryConstants'
import { captureError } from '@/utils/sentry'

import { aiBuilderCopilotService } from '../api/aiBuilderCopilotService'
import type {
  GenerateLessonDraftRequest,
  GenerateLessonDraftResponse,
  GenerateOutlineRequest,
  GenerateOutlineResponse,
  TransformContentRequest,
  TransformContentResponse,
} from '../types'

// ─── Query Keys ──────────────────────────────────────────────────────────────

const base = createQueryKeys('ai-builder-copilot')

export const aiBuilderCopilotKeys = {
  ...base,
  history: (tenantId: string, userId: string, courseId: string) =>
    [...base.all(tenantId), 'history', userId, courseId] as const,
}

// ─── Generate Outline ────────────────────────────────────────────────────────

export function useGenerateOutline() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<GenerateOutlineResponse, Error, GenerateOutlineRequest>({
    mutationFn: (req) => aiBuilderCopilotService.generateOutline(req),
    onSuccess: (_data, variables) => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: aiBuilderCopilotKeys.history(tenantId, user.id, variables.course_id),
        })
      }
    },
    onError: (err) => captureError(err, { context: 'useGenerateOutline' }),
  })
}

// ─── Generate Lesson Draft ───────────────────────────────────────────────────

export function useGenerateLessonDraft() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<GenerateLessonDraftResponse, Error, GenerateLessonDraftRequest>({
    mutationFn: (req) => aiBuilderCopilotService.generateLessonDraft(req),
    onSuccess: (_data, variables) => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: aiBuilderCopilotKeys.history(tenantId, user.id, variables.course_id),
        })
      }
    },
    onError: (err) => captureError(err, { context: 'useGenerateLessonDraft' }),
  })
}

// ─── Transform Content ───────────────────────────────────────────────────────

export function useTransformContent() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<TransformContentResponse, Error, TransformContentRequest>({
    mutationFn: (req) => aiBuilderCopilotService.transformContent(req),
    onSuccess: (_data, variables) => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: aiBuilderCopilotKeys.history(tenantId, user.id, variables.course_id),
        })
      }
    },
    onError: (err) => captureError(err, { context: 'useTransformContent' }),
  })
}

// ─── Apply Outline ───────────────────────────────────────────────────────────

export function useApplyOutline() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      artifactId,
      courseId,
      selectedModules,
    }: {
      artifactId: string
      courseId: string
      selectedModules: object[]
    }) => aiBuilderCopilotService.applyOutline(artifactId, courseId, selectedModules),
    onSuccess: (_data, variables) => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: aiBuilderCopilotKeys.history(tenantId, user.id, variables.courseId),
        })
      }
    },
    onError: (err) => captureError(err, { context: 'useApplyOutline' }),
  })
}

// ─── Apply Lesson Draft ──────────────────────────────────────────────────────

export function useApplyLessonDraft() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      artifactId,
      courseId,
      lessonId,
      selectedBlocks,
      quizPayload,
      assignmentPayload,
    }: {
      artifactId: string
      courseId: string
      lessonId: string
      selectedBlocks: object[]
      quizPayload?: object | null
      assignmentPayload?: object | null
    }) =>
      aiBuilderCopilotService.applyLessonDraft(
        artifactId,
        lessonId,
        selectedBlocks,
        quizPayload,
        assignmentPayload
      ),
    onSuccess: (_data, variables) => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: aiBuilderCopilotKeys.history(tenantId, user.id, variables.courseId),
        })
      }
    },
    onError: (err) => captureError(err, { context: 'useApplyLessonDraft' }),
  })
}

// ─── Artifact History ────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function useArtifactHistory(courseId: string | null) {
  const { tenantId, user } = useAuth()

  return useInfiniteQuery({
    queryKey: aiBuilderCopilotKeys.history(tenantId!, user!.id, courseId!),
    queryFn: async ({ pageParam }) => {
      return aiBuilderCopilotService.fetchArtifactHistory(
        courseId!,
        user!.id,
        pageParam as string | null,
        PAGE_SIZE
      )
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined
      return lastPage.items[lastPage.items.length - 1].created_at
    },
    enabled: !!tenantId && !!courseId && !!user,
    staleTime: STALE.DYNAMIC,
    gcTime: GC.NORMAL,
  })
}

// ─── Dismiss Artifact ────────────────────────────────────────────────────────

export function useDismissArtifact() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ artifactId, courseId }: { artifactId: string; courseId: string }) =>
      aiBuilderCopilotService.dismissArtifact(artifactId),
    onSuccess: (_data, variables) => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: aiBuilderCopilotKeys.history(tenantId, user.id, variables.courseId),
        })
      }
    },
    onError: (err) => captureError(err, { context: 'useDismissArtifact' }),
  })
}
