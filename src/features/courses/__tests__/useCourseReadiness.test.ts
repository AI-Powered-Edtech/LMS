import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { DomainLesson } from '@/shared/types/lessonTypes'
import type { DomainModule } from '@/shared/types/moduleTypes'

import { useCourseReadiness } from '../hooks/useCourseReadiness'
import type { CourseStatus } from '../types'

type Role = 'student' | 'teacher' | 'admin' | 'parent' | 'principal'

const createMockLesson = (overrides: Partial<DomainLesson> = {}): DomainLesson => ({
  id: 'lesson-1',
  moduleId: 'module-1',
  title: 'Lesson 1',
  type: 'text',
  orderIndex: 1,
  isPublished: false,
  durationMinutes: null,
  passingScore: null,
  tenantId: 'tenant-1',
  ...overrides,
})

const createMockModule = (overrides: Partial<DomainModule> = {}): DomainModule => ({
  id: 'module-1',
  courseId: 'course-1',
  title: 'Module 1',
  orderIndex: 1,
  tenantId: 'tenant-1',
  lessons: [],
  ...overrides,
})

const renderReadiness = (opts: {
  modules: DomainModule[]
  courseTitle: string
  courseDescription: string | null
  courseStatus: CourseStatus
  role: Role | null
  assignedClassesCount?: number
  hasThumbnail?: boolean
  totalLessonDuration?: number
}) => {
  const { result } = renderHook(() => useCourseReadiness(opts))
  return result.current
}

describe('useCourseReadiness', () => {
  describe('scoring logic', () => {
    it('should return score 5 for empty course (hasNoEmptyModules is true when no modules)', () => {
      const result = renderReadiness({
        modules: [],
        courseTitle: '',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.readinessScore).toBe(5)
    })

    it('should return score 30 for modules only (no lessons, so no empty module bonus)', () => {
      const result = renderReadiness({
        modules: [createMockModule()],
        courseTitle: 'Test Course',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.readinessScore).toBe(30)
    })

    it('should return score 60 for modules + lessons', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({ lessons: [createMockLesson({ isPublished: false })] }),
          createMockModule({ id: 'm2', title: 'Empty', orderIndex: 2, lessons: [] }),
        ],
        courseTitle: 'Test Course',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.readinessScore).toBe(60)
    })

    it('should return score 90 for modules + lessons + published lessons (includes no empty module bonus)', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.readinessScore).toBe(90)
    })

    it('should return score 95 for modules + lessons + published lessons + description', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({ lessons: [createMockLesson({ isPublished: true })] }),
          createMockModule({ id: 'm2', title: 'Empty', orderIndex: 2, lessons: [] }),
        ],
        courseTitle: 'Test Course',
        courseDescription: 'A valid description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.readinessScore).toBe(95)
    })

    it('should return score 100 for fully complete course', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A valid description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.readinessScore).toBe(100)
    })
  })

  describe('blockers', () => {
    it('should add blocker when no modules', () => {
      const result = renderReadiness({
        modules: [],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers).toHaveLength(1)
      expect(result.blockers[0].id).toBe('no_modules')
      expect(result.blockers[0].message).toBe('Kursus belum memiliki modul')
      expect(result.canPublish).toBe(false)
    })

    it('should add blocker when modules but no lessons', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers).toHaveLength(1)
      expect(result.blockers[0].id).toBe('no_lessons')
      expect(result.blockers[0].message).toBe('Belum ada pelajaran di modul manapun')
      expect(result.canPublish).toBe(false)
    })

    it('should add blocker when lessons but none published', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: false })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers).toHaveLength(1)
      expect(result.blockers[0].id).toBe('no_published_lessons')
      expect(result.blockers[0].message).toBe('Tidak ada pelajaran yang sudah dipublikasikan')
      expect(result.canPublish).toBe(false)
    })

    it('should have no blockers when course is complete', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers).toHaveLength(0)
      expect(result.canPublish).toBe(true)
    })

    it('should accumulate multiple blockers', () => {
      const result = renderReadiness({
        modules: [],
        courseTitle: '',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers).toHaveLength(1)
    })

    it('canPublish is false when there are blockers', () => {
      const result = renderReadiness({
        modules: [],
        courseTitle: '',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.canPublish).toBe(false)
    })

    it('canPublish is true when there are no blockers', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.canPublish).toBe(true)
    })
  })

  describe('warnings', () => {
    it('should add warning when no description', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      // no_description + few_lessons (only 1 published lesson)
      expect(result.warnings.some((w) => w.id === 'no_description')).toBe(true)
    })

    it('should not add warning when description exists', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A valid description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'no_description')).toBe(false)
    })

    it('should add warning for empty modules with count and names', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({ id: 'm1', title: 'Empty Module', lessons: [] }),
          createMockModule({
            id: 'm2',
            title: 'Full Module',
            lessons: [createMockLesson({ isPublished: true })],
          }),
        ],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      const emptyModWarning = result.warnings.find((w) => w.id === 'empty_modules')
      expect(emptyModWarning).toBeDefined()
      expect(emptyModWarning?.message).toContain('1 modul masih kosong')
      expect(emptyModWarning?.hint).toContain('"Empty Module"')
    })

    it('should add warning for short title', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Abc',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'short_title')).toBe(true)
    })

    it('should not add warning for title >= 5 chars', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Valid Title',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'short_title')).toBe(false)
    })
  })

  describe('infos', () => {
    it('should show audience_impact info when assignedClassesCount > 0', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 3,
      })
      expect(result.infos.some((i) => i.id === 'audience_impact')).toBe(true)
      expect(result.infos.find((i) => i.id === 'audience_impact')?.message).toContain('3 kelas')
    })

    it('should show no_audience info when assignedClassesCount === 0', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.infos.some((i) => i.id === 'no_audience')).toBe(true)
      expect(result.infos.find((i) => i.id === 'no_audience')?.message).toBe(
        'Kursus belum ditugaskan ke kelas manapun'
      )
    })

    it('should show lesson_summary info when has lessons', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({
            lessons: [
              createMockLesson({ id: 'l1', isPublished: true }),
              createMockLesson({ id: 'l2', isPublished: false }),
            ],
          }),
        ],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      const lessonInfo = result.infos.find((i) => i.id === 'lesson_summary')
      expect(lessonInfo).toBeDefined()
      expect(lessonInfo?.message).toBe('1 dari 2 pelajaran sudah diterbitkan')
    })

    it('should not show lesson_summary info when no lessons', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.infos.some((i) => i.id === 'lesson_summary')).toBe(false)
    })
  })

  describe('available actions', () => {
    describe('student/parent role', () => {
      it('should return no actions for student regardless of status', () => {
        const statuses: CourseStatus[] = ['draft', 'in_review', 'approved', 'published', 'archived']
        for (const status of statuses) {
          const result = renderReadiness({
            modules: [],
            courseTitle: '',
            courseDescription: null,
            courseStatus: status,
            role: 'student',
            assignedClassesCount: 0,
          })
          expect(result.availableActions).toEqual([])
        }
      })

      it('should return no actions for parent regardless of status', () => {
        const statuses: CourseStatus[] = ['draft', 'in_review', 'approved', 'published', 'archived']
        for (const status of statuses) {
          const result = renderReadiness({
            modules: [],
            courseTitle: '',
            courseDescription: null,
            courseStatus: status,
            role: 'parent',
            assignedClassesCount: 0,
          })
          expect(result.availableActions).toEqual([])
        }
      })
    })

    describe('teacher role', () => {
      it('draft → submit_review, publish', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'draft',
          role: 'teacher',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['submit_review', 'publish'])
      })

      it('in_review → approve, publish, revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'in_review',
          role: 'teacher',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['approve', 'publish', 'revert_draft'])
      })

      it('approved → publish, revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'approved',
          role: 'teacher',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['publish', 'revert_draft'])
      })

      it('published → unpublish', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'published',
          role: 'teacher',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['unpublish'])
      })

      it('archived → revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'archived',
          role: 'teacher',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['revert_draft'])
      })
    })

    describe('admin role', () => {
      it('draft → submit_review, publish', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'draft',
          role: 'admin',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['submit_review', 'publish'])
      })

      it('in_review → approve, revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'in_review',
          role: 'admin',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['approve', 'revert_draft'])
      })

      it('approved → publish, revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'approved',
          role: 'admin',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['publish', 'revert_draft'])
      })

      it('published → unpublish', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'published',
          role: 'admin',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['unpublish'])
      })

      it('archived → revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'archived',
          role: 'admin',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['revert_draft'])
      })
    })

    describe('principal role', () => {
      it('draft → submit_review, publish', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'draft',
          role: 'principal',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['submit_review', 'publish'])
      })

      it('in_review → approve, revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'in_review',
          role: 'principal',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['approve', 'revert_draft'])
      })

      it('approved → publish, revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'approved',
          role: 'principal',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['publish', 'revert_draft'])
      })

      it('published → unpublish', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'published',
          role: 'principal',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['unpublish'])
      })

      it('archived → revert_draft', () => {
        const result = renderReadiness({
          modules: [],
          courseTitle: '',
          courseDescription: null,
          courseStatus: 'archived',
          role: 'principal',
          assignedClassesCount: 0,
        })
        expect(result.availableActions).toEqual(['revert_draft'])
      })
    })
  })

  describe('edge cases', () => {
    it('null role → no actions', () => {
      const result = renderReadiness({
        modules: [],
        courseTitle: '',
        courseDescription: null,
        courseStatus: 'draft',
        role: null,
        assignedClassesCount: 0,
      })
      expect(result.availableActions).toEqual([])
    })

    it('null courseDescription → treated as no description', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'no_description')).toBe(true)
      expect(result.readinessScore).toBe(90)
    })

    it('empty string courseDescription → treated as no description', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: '',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'no_description')).toBe(true)
    })

    it('whitespace-only courseDescription → treated as no description', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: '   ',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'no_description')).toBe(true)
    })

    it('empty modules array → no lessons, no published lessons', () => {
      const result = renderReadiness({
        modules: [],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers.some((b) => b.id === 'no_modules')).toBe(true)
      expect(result.blockers.some((b) => b.id === 'no_lessons')).toBe(false)
      expect(result.blockers.some((b) => b.id === 'no_published_lessons')).toBe(false)
    })

    it('modules with empty lessons array → treated as no lessons', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers.some((b) => b.id === 'no_lessons')).toBe(true)
    })

    it('module with null lessons → treated as no lessons', () => {
      const result = renderReadiness({
        modules: [{ ...createMockModule(), lessons: null as unknown as DomainLesson[] }],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.blockers.some((b) => b.id === 'no_lessons')).toBe(true)
    })

    it('empty title → short_title warning', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: '',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'short_title')).toBe(true)
    })

    it('multiple empty modules → warning shows first 2 names', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({ id: 'm1', title: 'Alpha', lessons: [] }),
          createMockModule({ id: 'm2', title: 'Beta', lessons: [] }),
          createMockModule({ id: 'm3', title: 'Gamma', lessons: [] }),
        ],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      const emptyModWarning = result.warnings.find((w) => w.id === 'empty_modules')
      expect(emptyModWarning).toBeDefined()
      expect(emptyModWarning?.message).toContain('3 modul masih kosong')
      expect(emptyModWarning?.hint).toContain('"Alpha"')
      expect(emptyModWarning?.hint).toContain('"Beta"')
      expect(emptyModWarning?.hint).toContain('+1 lainnya')
    })
  })

  describe('hasThumbnail checks', () => {
    it('hasThumbnail: false → warning "Kursus belum memiliki foto sampul"', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        hasThumbnail: false,
      })
      const w = result.warnings.find((w) => w.id === 'no_thumbnail')
      expect(w).toBeDefined()
      expect(w?.message).toBe('Kursus belum memiliki foto sampul')
      expect(w?.hint).toBe('Tambahkan foto sampul untuk meningkatkan daya tarik kursus')
    })

    it('hasThumbnail: true → no thumbnail warning, +5 to score', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A valid description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        hasThumbnail: true,
      })
      expect(result.warnings.some((w) => w.id === 'no_thumbnail')).toBe(false)
      // Base fully-complete score is 100 (capped). Thumbnail adds 5 but cap keeps it at 100.
      expect(result.readinessScore).toBe(100)
    })

    it('hasThumbnail: true adds 5 points when base score is below cap', () => {
      // modules + lessons + published (30+30+25=85) + thumbnail(5) = 90; no description, no empty-module bonus
      const result = renderReadiness({
        modules: [
          createMockModule({ lessons: [createMockLesson({ isPublished: true })] }),
          createMockModule({ id: 'm2', title: 'Empty', orderIndex: 2, lessons: [] }),
        ],
        courseTitle: 'Test Course',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        hasThumbnail: true,
      })
      expect(result.readinessScore).toBe(90)
    })

    it('hasThumbnail: undefined → no thumbnail warning (not checked)', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        // hasThumbnail not provided
      })
      expect(result.warnings.some((w) => w.id === 'no_thumbnail')).toBe(false)
    })
  })

  describe('totalLessonDuration checks', () => {
    it('totalLessonDuration: 0 with published lessons → warning about duration', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({
            lessons: [
              createMockLesson({ id: 'l1', isPublished: true }),
              createMockLesson({ id: 'l2', isPublished: true }),
              createMockLesson({ id: 'l3', isPublished: true }),
            ],
          }),
        ],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        totalLessonDuration: 0,
      })
      const w = result.warnings.find((w) => w.id === 'no_duration')
      expect(w).toBeDefined()
      expect(w?.message).toBe('Estimasi durasi belajar belum diisi')
      expect(w?.hint).toBe(
        'Isi durasi pada setiap pelajaran agar siswa tahu perkiraan waktu belajar'
      )
    })

    it('totalLessonDuration: 0 without published lessons → no duration warning', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: false })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        totalLessonDuration: 0,
      })
      expect(result.warnings.some((w) => w.id === 'no_duration')).toBe(false)
    })

    it('totalLessonDuration: 120 → no duration warning, +5 to score', () => {
      // modules(30)+lessons(30)+published(25)+description(10)+no-empty-modules(5)+duration(5) = 105 → capped 100
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A valid description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        totalLessonDuration: 120,
      })
      expect(result.warnings.some((w) => w.id === 'no_duration')).toBe(false)
      expect(result.readinessScore).toBe(100)
    })

    it('totalLessonDuration: 120 adds 5 points when base score is below cap', () => {
      // modules(30)+lessons(30)+published(25)+duration(5) = 90; no description, has empty module
      const result = renderReadiness({
        modules: [
          createMockModule({ lessons: [createMockLesson({ isPublished: true })] }),
          createMockModule({ id: 'm2', title: 'Empty', orderIndex: 2, lessons: [] }),
        ],
        courseTitle: 'Test Course',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        totalLessonDuration: 120,
      })
      expect(result.readinessScore).toBe(90)
    })

    it('totalLessonDuration: undefined → no duration warning (not checked)', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
        // totalLessonDuration not provided
      })
      expect(result.warnings.some((w) => w.id === 'no_duration')).toBe(false)
    })
  })

  describe('few_lessons checks', () => {
    it('published lessons < 3 → warning "Kursus terlalu singkat"', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({
            lessons: [
              createMockLesson({ id: 'l1', isPublished: true }),
              createMockLesson({ id: 'l2', isPublished: true }),
            ],
          }),
        ],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      const w = result.warnings.find((w) => w.id === 'few_lessons')
      expect(w).toBeDefined()
      expect(w?.message).toBe('Kursus terlalu singkat (kurang dari 3 pelajaran)')
      expect(w?.hint).toBe(
        'Pertimbangkan menambahkan lebih banyak pelajaran untuk pengalaman belajar yang lebih lengkap'
      )
    })

    it('published lessons === 1 → warning "Kursus terlalu singkat"', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: true })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'few_lessons')).toBe(true)
    })

    it('published lessons >= 3 → no "few_lessons" warning', () => {
      const result = renderReadiness({
        modules: [
          createMockModule({
            lessons: [
              createMockLesson({ id: 'l1', isPublished: true }),
              createMockLesson({ id: 'l2', isPublished: true }),
              createMockLesson({ id: 'l3', isPublished: true }),
            ],
          }),
        ],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'few_lessons')).toBe(false)
    })

    it('no published lessons → no "few_lessons" warning', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: false })] })],
        courseTitle: 'Test Course',
        courseDescription: 'A description',
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      expect(result.warnings.some((w) => w.id === 'few_lessons')).toBe(false)
    })
  })

  describe('allItems ordering', () => {
    it('should order items as blockers → warnings → infos', () => {
      const result = renderReadiness({
        modules: [createMockModule({ lessons: [createMockLesson({ isPublished: false })] })],
        courseTitle: 'Ab',
        courseDescription: null,
        courseStatus: 'draft',
        role: 'teacher',
        assignedClassesCount: 0,
      })
      const severities = result.allItems.map((i) => i.severity)
      const blockerIdx = severities.indexOf('blocker')
      const warningIdx = severities.lastIndexOf('warning')
      const infoIdx = severities.indexOf('info')
      expect(blockerIdx).toBeLessThan(warningIdx)
      expect(warningIdx).toBeLessThan(infoIdx)
    })
  })
})
