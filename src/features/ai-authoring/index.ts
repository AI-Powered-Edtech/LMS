// ─── Types & Constants ────────────────────────────────────────────────────────
export type {
  AIAuthoringQuestion,
  AIGeneratedContent,
  AIOpenQuestion,
  AIQuizQuestion,
  AISourceType,
  AssignmentType,
  BloomLevel,
  CurriculumConfig,
  GenerateFromFileConfig,
  GenerateFromFileResponse,
  GenerateFromLessonConfig,
  GenerateFromLessonResponse,
  QuestionType,
} from './types'
export {
  BLOOM_DESCRIPTIONS,
  BLOOM_LABELS,
  isOpenQuestion,
  isQuizQuestion,
  QUESTION_TYPE_COLORS,
  QUESTION_TYPE_LABELS,
} from './types'

// ─── React Query Hooks & Keys ─────────────────────────────────────────────────
export {
  aiAuthoringKeys,
  useAIContentHistory,
  useDeleteGeneration,
  useGenerateFromFile,
  useGenerateFromLesson,
  useMarkContentUsed,
  useUpdateGenerationQuestions,
} from './queries/aiAuthoringQueries'

// ─── Service ──────────────────────────────────────────────────────────────────
export { aiAuthoringService } from './api/aiAuthoringService'
