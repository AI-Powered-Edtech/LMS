// Public API for the creator feature module

export { creatorService } from './api/creatorService'
export {
  creatorKeys,
  useAIContentHistory,
  useDeleteGeneration,
  useGenerateAIContent,
  useMarkContentUsed,
  useUpdateGenerationQuestions,
} from './queries/creatorQueries'
export type { PendingQuizData } from './store/creatorBridge.store'
export { useCreatorBridgeStore } from './store/creatorBridge.store'
export type {
  AIGeneratedContent,
  AssignmentType,
  BloomLevel,
  CreatorResultState,
  GenerateAIContentRequest,
  GenerateAIContentResponse,
  GeneratedOpenQuestion,
  GeneratedQuestion,
  GeneratedQuizQuestion,
} from './types'
export { BLOOM_DESCRIPTIONS, BLOOM_LABELS } from './types'
