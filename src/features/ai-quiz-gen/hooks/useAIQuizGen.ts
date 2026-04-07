import type { GenerateFromLessonConfig } from '@/features/ai-authoring'
import { useGenerateFromLesson } from '@/features/ai-authoring'

/**
 * Backward-compat wrapper around useGenerateFromLesson (React Query useMutation).
 * Preserves the old { generate, isGenerating, result, error, reset } interface.
 */
export function useAIQuizGen() {
  const mutation = useGenerateFromLesson()

  const generate = (config: GenerateFromLessonConfig) => mutation.mutate(config)

  return {
    generate,
    isGenerating: mutation.isPending,
    result: mutation.data ?? null,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    reset: mutation.reset,
  }
}
