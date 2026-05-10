// ai-authoring is the single source of truth for all AI content generation.
// This module re-exports everything for backward compatibility with QuizBlockEditor.

export type { AIQuizQuestion as GeneratedQuestion } from "@/features/ai-authoring";
export { AIQuizGeneratorPanel } from "@/features/ai-authoring/components/AIQuizGeneratorPanel";
