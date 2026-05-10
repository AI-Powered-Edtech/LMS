// Backward-compat delegation
import type { GenerateFromLessonConfig } from "@/features/ai-authoring";
import { aiAuthoringService } from "@/features/ai-authoring";

export const aiQuizGenService = {
  generateQuestions: (config: GenerateFromLessonConfig) =>
    aiAuthoringService.generateFromLesson(config),
};
