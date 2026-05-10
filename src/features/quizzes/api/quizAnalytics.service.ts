// Re-export barrel — all quiz analytics logic now lives in quizAnalyticsService.ts
// This file is kept for backward-compatibility with existing imports.

export {
  type AttemptDetailAnswer,
  getQuestionStats,
  type QuestionDifficulty,
  type QuestionStatsWithQuestion,
  quizAnalyticsService,
  type QuizStats,
} from "./quizAnalyticsService";
