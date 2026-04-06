/**
 * Unit tests for Notification Batching Service
 */

import { describe, expect, it } from 'vitest'

import {
  batchSimilarNotifications,
  getBatchNotifications,
  isBatchedNotification,
} from '../services/notificationBatching'

import type { Notification } from '../types'

describe('Notification Batching Service', () => {
  const createNotification = (
    id: string,
    type: string,
    title: string,
    minutesAgo: number
  ): Notification => ({
    id,
    tenant_id: 'test-tenant',
    user_id: 'test-user',
    actor_id: null,
    type,
    title,
    message: `Message for ${title}`,
    is_read: false,
    created_at: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    link: null,
    metadata: null,
  })

  describe('batchSimilarNotifications', () => {
    it('should return empty array for empty input', () => {
      const result = batchSimilarNotifications([])
      expect(result).toEqual([])
    })

    it('should not batch read notifications', () => {
      const notifications = [
        { ...createNotification('1', 'assignment_due', 'Assignment 1', 10), is_read: true },
      ]

      const result = batchSimilarNotifications(notifications)

      expect(result).toHaveLength(0) // Read notifications are filtered out
    })

    it('should keep single notification unbatched', () => {
      const notifications = [createNotification('1', 'assignment_due', 'Assignment 1', 10)]

      const result = batchSimilarNotifications(notifications)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should batch similar notifications within time window', () => {
      const notifications = [
        createNotification('1', 'assignment_due', 'Assignment 1', 10),
        createNotification('2', 'assignment_due', 'Assignment 2', 20),
        createNotification('3', 'assignment_due', 'Assignment 3', 30),
      ]

      const result = batchSimilarNotifications(notifications, 60)

      expect(result).toHaveLength(1)
      expect(result[0].title).toContain('3')
      expect(result[0].title).toContain('tugas menanti')
    })

    it('should not batch notifications outside time window', () => {
      const notifications = [
        createNotification('1', 'assignment_due', 'Assignment 1', 10),
        createNotification('2', 'assignment_due', 'Assignment 2', 120), // 2 hours ago
      ]

      const result = batchSimilarNotifications(notifications, 60)

      expect(result).toHaveLength(2) // Separate batches
    })

    it('should not batch different notification types', () => {
      const notifications = [
        createNotification('1', 'assignment_due', 'Assignment 1', 10),
        createNotification('2', 'grade_posted', 'Grade 1', 15),
      ]

      const result = batchSimilarNotifications(notifications, 60)

      expect(result).toHaveLength(2)
    })

    it('should create proper batch title for assignment_due', () => {
      const notifications = [
        createNotification('1', 'assignment_due', 'Assignment 1', 10),
        createNotification('2', 'assignment_due', 'Assignment 2', 20),
      ]

      const result = batchSimilarNotifications(notifications, 60)

      expect(result[0].title).toContain('tugas menanti')
      expect(result[0].title).toContain('2')
    })

    it('should create proper batch title for grade_posted', () => {
      const notifications = [
        createNotification('1', 'grade_posted', 'Grade 1', 10),
        createNotification('2', 'grade_posted', 'Grade 2', 20),
      ]

      const result = batchSimilarNotifications(notifications, 60)

      expect(result[0].title).toContain('nilai baru')
      expect(result[0].title).toContain('2')
    })

    it('should include first 3 titles in batch message', () => {
      const notifications = [
        createNotification('1', 'assignment_due', 'Math HW', 10),
        createNotification('2', 'assignment_due', 'Science HW', 15),
        createNotification('3', 'assignment_due', 'English HW', 20),
        createNotification('4', 'assignment_due', 'History HW', 25),
      ]

      const result = batchSimilarNotifications(notifications, 60)

      expect(result).toHaveLength(1)
      expect(result[0].message).toContain('Math HW')
      expect(result[0].message).toContain('Science HW')
      expect(result[0].message).toContain('English HW')
      expect(result[0].message).toContain('1 lainnya')
    })

    it('should sort batched notifications by date', () => {
      const notifications = [
        createNotification('1', 'assignment_due', 'Assignment 1', 30),
        createNotification('2', 'grade_posted', 'Grade 1', 10),
      ]

      const result = batchSimilarNotifications(notifications, 60)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('2') // Most recent first
      expect(result[1].id).toBe('1')
    })
  })

  describe('isBatchedNotification', () => {
    it('should return true for batched notification', () => {
      const notification: Notification = {
        ...createNotification('1', 'assignment_due', 'Batch', 10),
        metadata: {
          batch_count: 5,
          batch_ids: ['1', '2', '3', '4', '5'],
        },
      }

      expect(isBatchedNotification(notification)).toBe(true)
    })

    it('should return false for single notification', () => {
      const notification = createNotification('1', 'assignment_due', 'Single', 10)

      expect(isBatchedNotification(notification)).toBe(false)
    })
  })

  describe('getBatchNotifications', () => {
    it('should return original notification if not batched', () => {
      const notification = createNotification('1', 'assignment_due', 'Single', 10)

      const result = getBatchNotifications(notification)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should return batch notification if batched', () => {
      const notification: Notification = {
        ...createNotification('batch-1', 'assignment_due', 'Batch', 10),
        metadata: {
          batch_count: 3,
          batch_ids: ['1', '2', '3'],
        },
      }

      const result = getBatchNotifications(notification)

      // In current implementation, returns the batch itself
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('batch-1')
    })
  })
})
