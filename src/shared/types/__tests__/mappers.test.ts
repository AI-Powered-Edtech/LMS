import { describe, expect, it } from 'vitest'

import { mapBlock } from '../blockMappers'
import { mapCourse } from '../courseMappers'
import { mapLesson } from '../lessonMappers'
import { mapModule } from '../moduleMappers'

describe('Domain Mappers', () => {
  describe('mapCourse', () => {
    it('should map a valid course row to DomainCourse', () => {
      const row = {
        id: 'course-1',
        title: 'Course 1',
        description: 'Description',
        status: 'published',
        tenant_id: 'tenant-1',
        published_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }
      const result = mapCourse(row)
      expect(result).toEqual({
        id: 'course-1',
        title: 'Course 1',
        description: 'Description',
        status: 'published',
        tenantId: 'tenant-1',
        publishedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      })
    })

    it('should handle partial/invalid rows gracefully via validate', () => {
      const row = {
        id: 'course-2',
        title: 'Course 2',
      }
      const result = mapCourse(row)
      expect(result.id).toBe('course-2')
      expect(result.title).toBe('Course 2')
      expect(result.tenantId).toBeUndefined()
    })
  })

  describe('mapLesson', () => {
    it('should map a valid lesson row to DomainLesson', () => {
      const row = {
        id: 'lesson-1',
        module_id: 'module-1',
        title: 'Lesson 1',
        type: 'video',
        order: 1,
        is_published: true,
        duration_minutes: 30,
        passing_score: 80,
        tenant_id: 'tenant-1',
      }
      const result = mapLesson(row)
      expect(result).toEqual({
        id: 'lesson-1',
        moduleId: 'module-1',
        title: 'Lesson 1',
        type: 'video',
        orderIndex: 1,
        isPublished: true,
        durationMinutes: 30,
        passingScore: 80,
        tenantId: 'tenant-1',
      })
    })
  })

  describe('mapModule', () => {
    it('should map a valid module row to DomainModule without lessons', () => {
      const row = {
        id: 'module-1',
        course_id: 'course-1',
        title: 'Module 1',
        order: 1,
        tenant_id: 'tenant-1',
      }
      const result = mapModule(row)
      expect(result).toEqual({
        id: 'module-1',
        courseId: 'course-1',
        title: 'Module 1',
        orderIndex: 1,
        tenantId: 'tenant-1',
        lessons: [],
      })
    })

    it('should map a valid module row to DomainModule with lessons', () => {
      const row = {
        id: 'module-1',
        course_id: 'course-1',
        title: 'Module 1',
        order: 1,
        tenant_id: 'tenant-1',
        lessons: [
          {
            id: 'lesson-1',
            module_id: 'module-1',
            title: 'Lesson 1',
            type: 'video',
            order: 1,
            is_published: true,
            tenant_id: 'tenant-1',
          },
        ],
      }
      const result = mapModule(row)
      expect(result.lessons.length).toBe(1)
      expect(result.lessons[0].title).toBe('Lesson 1')
      expect(result.lessons[0].moduleId).toBe('module-1')
    })
  })

  describe('mapBlock', () => {
    it('should map a valid block row to DomainBlock', () => {
      const row = {
        id: 'block-1',
        lesson_id: 'lesson-1',
        type: 'text',
        url: 'http://example.com',
        title: 'Block 1',
        content: 'Content',
        metadata: { key: 'value' },
        order_index: 1,
        tenant_id: 'tenant-1',
      }
      const result = mapBlock(row)
      expect(result).toEqual({
        id: 'block-1',
        lessonId: 'lesson-1',
        type: 'text',
        url: 'http://example.com',
        title: 'Block 1',
        content: 'Content',
        metadata: { key: 'value' },
        orderIndex: 1,
        tenantId: 'tenant-1',
      })
    })
  })
})
