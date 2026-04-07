// Re-export from ai-authoring with backward-compat names
export type { GenerateFromFileResponse } from '@/features/ai-authoring'
export {
  aiAuthoringKeys as creatorKeys,
  useAIContentHistory,
  useDeleteGeneration,
  useGenerateFromFile as useGenerateAIContent,
  useMarkContentUsed,
  useUpdateGenerationQuestions,
} from '@/features/ai-authoring'
