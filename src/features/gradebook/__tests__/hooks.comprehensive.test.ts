import { describe, expect, it } from 'vitest'

import {
  getGradeColor,
  getGradeBg,
  getTypeLabel,
  getTypeColor,
} from '../hooks/useGradebookState'

// ==========================================================================
// SA2: Gradebook Hook Helper Tests
// ==========================================================================

describe('getGradeColor', () => {
  it('returns slate for null score', () => {
    expect(getGradeColor(null)).toContain('slate')
  })

  it('returns slate for zero score', () => {
    expect(getGradeColor(0)).toContain('slate')
  })

  it('returns green for score >= 85', () => {
    expect(getGradeColor(85)).toContain('green')
    expect(getGradeColor(100)).toContain('green')
  })

  it('returns blue for score >= 70 and < 85', () => {
    expect(getGradeColor(70)).toContain('blue')
    expect(getGradeColor(84)).toContain('blue')
  })

  it('returns yellow for score >= 60 and < 70', () => {
    expect(getGradeColor(60)).toContain('yellow')
    expect(getGradeColor(69)).toContain('yellow')
  })

  it('returns red for score < 60', () => {
    expect(getGradeColor(59)).toContain('red')
    expect(getGradeColor(10)).toContain('red')
  })
})

describe('getGradeBg', () => {
  it('returns slate bg for null score', () => {
    expect(getGradeBg(null)).toContain('slate')
  })

  it('returns green bg for high scores', () => {
    expect(getGradeBg(90)).toContain('green')
  })

  it('returns red bg for low scores', () => {
    expect(getGradeBg(30)).toContain('red')
  })
})

describe('getTypeLabel', () => {
  it('maps quiz to Auto-grade', () => {
    expect(getTypeLabel('quiz')).toBe('Auto-grade')
  })

  it('maps assignment to Tugas', () => {
    expect(getTypeLabel('assignment')).toBe('Tugas')
  })

  it('maps project to Proyek', () => {
    expect(getTypeLabel('project')).toBe('Proyek')
  })

  it('maps exam to Ujian', () => {
    expect(getTypeLabel('exam')).toBe('Ujian')
  })

  it('maps presentation to Presentasi', () => {
    expect(getTypeLabel('presentation')).toBe('Presentasi')
  })

  it('maps offline to Offline', () => {
    expect(getTypeLabel('offline')).toBe('Offline')
  })

  it('returns raw type for unknown types', () => {
    expect(getTypeLabel('custom')).toBe('custom')
  })
})

describe('getTypeColor', () => {
  it('returns blue for quiz', () => {
    expect(getTypeColor('quiz')).toContain('blue')
  })

  it('returns red for exam', () => {
    expect(getTypeColor('exam')).toContain('red')
  })

  it('returns purple for project', () => {
    expect(getTypeColor('project')).toContain('purple')
  })

  it('returns orange for presentation', () => {
    expect(getTypeColor('presentation')).toContain('orange')
  })

  it('returns slate for unknown types', () => {
    expect(getTypeColor('something-else')).toContain('slate')
  })
})

// ==========================================================================
// useCourseReadiness — Pure logic tests for scoring & actions
// ==========================================================================

describe('CourseReadiness scoring logic', () => {
  // Replicate the scoring function from useCourseReadiness
  function computeScore(
    hasModules: boolean,
    hasLessons: boolean,
    hasPublishedLessons: boolean,
    hasDescription: boolean,
    hasNoEmptyModules: boolean,
    hasThumbnail: boolean,
    hasDuration: boolean
  ): number {
    let score = 0
    if (hasModules) score += 30
    if (hasLessons) score += 30
    if (hasPublishedLessons) score += 25
    if (hasDescription) score += 10
    if (hasNoEmptyModules) score += 5
    if (hasThumbnail) score += 5
    if (hasDuration) score += 5
    return Math.min(score, 100)
  }

  it('returns 0 when nothing is ready', () => {
    expect(computeScore(false, false, false, false, false, false, false)).toBe(0)
  })

  it('returns 30 when only modules exist', () => {
    expect(computeScore(true, false, false, false, false, false, false)).toBe(30)
  })

  it('returns 60 when modules + lessons exist', () => {
    expect(computeScore(true, true, false, false, false, false, false)).toBe(60)
  })

  it('returns 85 for modules + lessons + published lessons', () => {
    expect(computeScore(true, true, true, false, false, false, false)).toBe(85)
  })

  it('caps at 100 even if all criteria are met (110 raw)', () => {
    expect(computeScore(true, true, true, true, true, true, true)).toBe(100)
  })

  it('returns 95 when description is added but no thumbnail', () => {
    expect(computeScore(true, true, true, true, false, false, false)).toBe(95)
  })
})

describe('CourseReadiness availableActions', () => {
  type CourseStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived'
  type CourseAction = 'submit_review' | 'approve' | 'publish' | 'unpublish' | 'revert_draft'
  type UserRole = 'admin' | 'teacher' | 'principal' | 'student' | 'parent'

  function computeAvailableActions(status: CourseStatus, role: UserRole | null): CourseAction[] {
    if (!role || role === 'student' || role === 'parent') return []
    const actions: CourseAction[] = []
    switch (status) {
      case 'draft':
        actions.push('submit_review', 'publish')
        break
      case 'in_review':
        if (role === 'admin' || role === 'principal') {
          actions.push('approve', 'revert_draft')
        }
        if (role === 'teacher') {
          actions.push('approve', 'publish', 'revert_draft')
        }
        break
      case 'approved':
        actions.push('publish', 'revert_draft')
        break
      case 'published':
        actions.push('unpublish')
        break
      case 'archived':
        actions.push('revert_draft')
        break
    }
    return actions
  }

  it('returns empty for student role', () => {
    expect(computeAvailableActions('draft', 'student')).toEqual([])
  })

  it('returns empty for parent role', () => {
    expect(computeAvailableActions('published', 'parent')).toEqual([])
  })

  it('returns empty for null role', () => {
    expect(computeAvailableActions('draft', null)).toEqual([])
  })

  it('teacher can submit_review and publish from draft', () => {
    const actions = computeAvailableActions('draft', 'teacher')
    expect(actions).toContain('submit_review')
    expect(actions).toContain('publish')
  })

  it('admin can approve and revert_draft from in_review', () => {
    const actions = computeAvailableActions('in_review', 'admin')
    expect(actions).toContain('approve')
    expect(actions).toContain('revert_draft')
  })

  it('teacher can approve, publish, and revert_draft from in_review', () => {
    const actions = computeAvailableActions('in_review', 'teacher')
    expect(actions).toContain('approve')
    expect(actions).toContain('publish')
    expect(actions).toContain('revert_draft')
  })

  it('any authorized role can unpublish a published course', () => {
    expect(computeAvailableActions('published', 'teacher')).toContain('unpublish')
    expect(computeAvailableActions('published', 'admin')).toContain('unpublish')
  })

  it('archived course only allows revert_draft', () => {
    expect(computeAvailableActions('archived', 'teacher')).toEqual(['revert_draft'])
  })
})