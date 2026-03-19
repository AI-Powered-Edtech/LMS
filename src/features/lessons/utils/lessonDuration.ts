import type { Lesson } from '../types';

/**
 * Count words in a text string.
 * Handles null/empty content gracefully.
 */
function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Get estimated duration for a single lesson in minutes.
 *
 * Priority:
 * 1. If `lesson.duration_minutes` is set (manual override) -> use it
 * 2. Fallback auto-estimate by lesson type:
 *    - video       -> 5 min default
 *    - article/text -> word count / 200 wpm, minimum 1 min
 *    - quiz        -> count quiz-type resources x 1 min per question (approximate)
 *    - assignment   -> 10 min default
 *    - unknown      -> 3 min default
 */
export function getLessonDuration(lesson: Lesson): number {
  // 1. Manual override
  if (lesson.duration_minutes != null && lesson.duration_minutes > 0) {
    return lesson.duration_minutes;
  }

  // 2. Auto-estimate by type
  switch (lesson.type) {
    case 'video':
      return 5;

    case 'article':
    case 'text': {
      const words = countWords(lesson.content);
      if (words === 0) return 1;
      return Math.max(1, Math.round(words / 200));
    }

    case 'quiz': {
      // Count total questions across all quizzes attached to the lesson
      const questionCount = lesson.quizzes?.reduce(
        (sum, quiz) => sum + (quiz.quiz_questions?.length ?? 0),
        0,
      ) ?? 0;
      // Also count quiz-type resources as a fallback signal
      const quizResourceCount = lesson.lesson_resources?.filter(
        (r) => r.type === 'quiz',
      ).length ?? 0;
      const estimated = questionCount > 0 ? questionCount : quizResourceCount;
      return Math.max(1, estimated);
    }

    case 'assignment':
      return 10;

    default:
      return 3;
  }
}

/**
 * Get total duration for a list of lessons in minutes.
 */
export function getModuleDuration(lessons: Lesson[]): number {
  return lessons.reduce((total, lesson) => total + getLessonDuration(lesson), 0);
}

/**
 * Format duration for display.
 *
 * Examples:
 * - 5   -> "5 min"
 * - 80  -> "1j 20m"
 * - 120 -> "2j 0m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}j ${remaining}m`;
}
