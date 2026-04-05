// Re-export unified types from ai-authoring (single source of truth)
import type { GenerateFromFileResponse } from '@/features/ai-authoring'

export type {
  AIGeneratedContent,
  AssignmentType,
  BloomLevel,
  CurriculumConfig,
  GenerateFromFileConfig as GenerateAIContentRequest,
  AIOpenQuestion as GeneratedOpenQuestion,
  AIAuthoringQuestion as GeneratedQuestion,
  AIQuizQuestion as GeneratedQuizQuestion,
} from '@/features/ai-authoring'
export {
  BLOOM_DESCRIPTIONS,
  BLOOM_LABELS,
  isOpenQuestion,
  isQuizQuestion,
} from '@/features/ai-authoring'

/**
 * Client-facing response type for AI content generation.
 * tenant_id is intentionally excluded — it is not required on the client side.
 */
export type GenerateAIContentResponse = Omit<GenerateFromFileResponse, 'tenant_id'>
