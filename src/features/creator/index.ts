// ai-authoring is the single source of truth for all AI content generation.
// This module re-exports everything for backward compatibility.

// Types — sourced from ./types which re-exports ai-authoring with backward-compat aliases
export type {
  AIGeneratedContent,
  AssignmentType,
  BloomLevel,
  CurriculumConfig,
  GenerateAIContentResponse,
  GeneratedOpenQuestion,
  GeneratedQuestion,
  GeneratedQuizQuestion,
} from './types'
export { BLOOM_DESCRIPTIONS, BLOOM_LABELS, isOpenQuestion, isQuizQuestion } from './types'

// Hooks — sourced directly from ai-authoring with backward-compat names
export {
  useAIContentHistory,
  useDeleteGeneration,
  useGenerateFromFile as useGenerateAIContent,
  useMarkContentUsed,
  useUpdateGenerationQuestions,
} from '@/features/ai-authoring'
