import { describe, expect, it } from 'vitest'

import type { Lesson, LessonProgress } from '../../types'
import { isLessonLocked } from '../lessonAccess'

describe('isLessonLocked', () => {
  const mockLessons: Partial<Lesson>[] = [
    { id: 'lesson-1', order: 0 },
    { id: 'lesson-2', order: 1 },
    { id: 'lesson-3', order: 2 },
  ]

  const mockProgress: Record<string, Partial<LessonProgress>> = {
    'lesson-1': { completed: true },
    'lesson-2': { completed: false },
  }

  it('should return false for teacher role, regardless of progress or index', () => {
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        2,
        'teacher'
      )
    ).toBe(false)
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        1,
        'teacher'
      )
    ).toBe(false)
  })

  it('should return false for admin role, regardless of progress or index', () => {
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        2,
        'admin'
      )
    ).toBe(false)
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        1,
        'admin'
      )
    ).toBe(false)
  })

  it('should return false for the first lesson (index 0), regardless of role or progress', () => {
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        0,
        'student'
      )
    ).toBe(false)
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        0,
        undefined
      )
    ).toBe(false)
  })

  it('should return false if the previous lesson is completed (for a student)', () => {
    // Checking lesson at index 1 (lesson-2). Previous is lesson-1 (completed: true)
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        1,
        'student'
      )
    ).toBe(false)
  })

  it('should return true if the previous lesson is NOT completed (for a student)', () => {
    // Checking lesson at index 2 (lesson-3). Previous is lesson-2 (completed: false)
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        2,
        'student'
      )
    ).toBe(true)
  })

  it('should return false if the previous lesson is missing in the array', () => {
    // Edge case: if index - 1 is negative, though index 0 is handled above,
    // or if the array has a gap (e.g., checking index 5 in an array of length 3).
    // The code does: const prevLesson = lessons[index - 1]; if (!prevLesson) return false;
    expect(
      isLessonLocked(
        mockLessons as Lesson[],
        mockProgress as Record<string, LessonProgress>,
        5,
        'student'
      )
    ).toBe(false)
  })

  it('should return true if the progress for the previous lesson is missing', () => {
    const lessons: Partial<Lesson>[] = [
      { id: 'lesson-a', order: 0 },
      { id: 'lesson-b', order: 1 },
    ]
    const progress: Record<string, Partial<LessonProgress>> = {} // No progress for lesson-a
    expect(
      isLessonLocked(lessons as Lesson[], progress as Record<string, LessonProgress>, 1, 'student')
    ).toBe(true)
  })
})
