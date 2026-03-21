import type { Lesson, LessonProgress } from '../types'

/**
 * Determines if a lesson is locked based on the completion status of the previous lesson.
 *
 * @param lessons - Array of all lessons in order
 * @param progress - Record of lesson progress by lesson ID
 * @param index - Index of the lesson to check
 * @param role - User's role (teacher or admin bypasses locks)
 * @returns true if the lesson is locked, false otherwise
 */
export function isLessonLocked(
  lessons: Lesson[],
  progress: Record<string, LessonProgress>,
  index: number,
  role?: string
): boolean {
  // Teachers and admins can access all lessons
  if (role === 'teacher' || role === 'admin') return false

  // First lesson is never locked
  if (index === 0) return false

  // Check if the previous lesson is completed
  const prevLesson = lessons[index - 1]
  if (!prevLesson) return false

  const prevProgress = progress[prevLesson.id]
  return !prevProgress?.completed
}
