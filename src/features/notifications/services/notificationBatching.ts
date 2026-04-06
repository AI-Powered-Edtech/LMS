/**
 * Notification Batching Service
 *
 * Groups similar notifications together to reduce notification fatigue
 * and improve user experience.
 */

import { supabase } from '@/services/supabase/client'

import type { Notification } from '../types'

export type BatchGroupKey = 'assignment_due' | 'grade_posted' | 'quiz_result' | 'announcement' | 'message'

export interface NotificationBatch {
  id: string
  group_key: BatchGroupKey
  tenant_id: string
  user_id: string
  count: number
  latest_notification_id: string
  created_at: string
  expires_at: string
}

/**
 * Batch similar notifications together
 *
 * Instead of showing 10 "assignment due" notifications,
 * show 1 "10 assignments due" notification
 */
export function batchSimilarNotifications(
  notifications: Notification[],
  windowMinutes: number = 60
): Notification[] {
  if (notifications.length === 0) return []

  // Group notifications by type and time window
  const groups: Map<string, Notification[]> = new Map()

  for (const notification of notifications) {
    if (notification.is_read) {
      // Don't batch read notifications
      continue
    }

    // Create group key based on type and time window
    const timestamp = new Date(notification.created_at).getTime()
    const windowKey = Math.floor(timestamp / (windowMinutes * 60 * 1000))
    const groupKey = `${notification.type}:${windowKey}`

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(notification)
  }

  // Convert groups back to batched notifications
  const batched: Notification[] = []

  for (const [groupKey, groupNotifications] of groups) {
    if (groupNotifications.length === 1) {
      // Single notification, no need to batch
      batched.push(groupNotifications[0])
    } else {
      // Create batched notification
      const latest = groupNotifications[0]
      batched.push({
        ...latest,
        title: `${groupNotifications.length} ${getBatchTitle(latest.type, groupNotifications.length)}`,
        message: getBatchMessage(latest.type, groupNotifications),
        metadata: {
          ...latest.metadata,
          batch_count: groupNotifications.length,
          batch_ids: groupNotifications.map((n) => n.id),
        },
      })
    }
  }

  // Sort by creation date
  return batched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

/**
 * Get batch title based on notification type
 */
function getBatchTitle(type: string, count: number): string {
  switch (type) {
    case 'assignment_due':
      return `tugas menanti (${count})`
    case 'grade_posted':
      return `nilai baru (${count})`
    case 'quiz_result':
      return `hasil kuis (${count})`
    case 'announcement':
      return `pengumuman (${count})`
    case 'message':
      return `pesan baru (${count})`
    default:
      return `notifikasi (${count})`
  }
}

/**
 * Get batch message summarizing grouped notifications
 */
function getBatchMessage(type: string, notifications: Notification[]): string {
  const titles = notifications.slice(0, 3).map((n) => n.title)
  const remaining = notifications.length - 3

  if (remaining > 0) {
    return `${titles.join(', ')}, dan ${remaining} lainnya`
  }

  return titles.join(', ')
}

/**
 * Clean up expired batches from database
 */
export async function cleanupExpiredBatches(): Promise<void> {
  const { error } = await supabase
    .from('notification_batches')
    .delete()
    .lt('expires_at', new Date().toISOString())

  if (error && import.meta.env.DEV) {
    console.warn('[Notification Batching] Cleanup error:', error.message)
  }
}

/**
 * Check if notification is part of a batch
 */
export function isBatchedNotification(notification: Notification): boolean {
  const metadata = notification.metadata as Record<string, unknown> | undefined
  return !!metadata?.batch_count && (metadata.batch_count as number) > 1
}

/**
 * Get individual notifications from a batch
 */
export function getBatchNotifications(notification: Notification): Notification[] {
  const metadata = notification.metadata as Record<string, unknown> | undefined
  const batchIds = metadata?.batch_ids as string[] | undefined

  if (!batchIds || batchIds.length === 0) {
    return [notification]
  }

  // In a real implementation, fetch from database
  // For now, return the batch notification itself
  return [notification]
}
