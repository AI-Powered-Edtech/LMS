// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  AIBuilderArtifact,
  ApplyLessonDraftResult,
  ApplyOutlineResult,
  ArtifactKind,
  ArtifactSourceType,
  ArtifactStatus,
  ArtifactTargetType,
  AssignmentDraftPayload,
  AssessmentSuggestions,
  CopilotLaunchContext,
  CopilotTab,
  GenerateLessonDraftRequest,
  GenerateLessonDraftResponse,
  GenerateOutlineRequest,
  GenerateOutlineResponse,
  LessonDraftBlock,
  OutlineLesson,
  OutlineModule,
  QuizDraftPayload,
  QuizDraftQuestion,
  TransformAction,
  TransformContentRequest,
  TransformContentResponse,
} from './types'

export {
  ARTIFACT_KIND_LABELS,
  ARTIFACT_STATUS_LABELS,
  TRANSFORM_ACTION_LABELS,
} from './types'

// ─── Service ──────────────────────────────────────────────────────────────────
export { aiBuilderCopilotService } from './api/aiBuilderCopilotService'

// ─── Query Hooks ──────────────────────────────────────────────────────────────
export {
  aiBuilderCopilotKeys,
  useApplyLessonDraft,
  useApplyOutline,
  useArtifactHistory,
  useDismissArtifact,
  useGenerateLessonDraft,
  useGenerateOutline,
  useTransformContent,
} from './queries/aiBuilderCopilotQueries'

// ─── Store ────────────────────────────────────────────────────────────────────
export { useBuilderAICopilotStore } from './store/builderAICopilot.store'

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useAICopilotFeatureGate } from './hooks/useAICopilotFeatureGate'
