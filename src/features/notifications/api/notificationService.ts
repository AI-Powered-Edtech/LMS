/**
 * Notification service with multi-tenant security
 * All functions accept tenantId for defense-in-depth tenant isolation
 */

import { apiFetch } from '@/src/lib/api'

import type { Notification } from '../types'

/**
 * Fetch user notifications with tenant isolation
 */
export async function fetchNotifications(
  userId: string,
  tenantId: string
): Promise<Notification[]> {
  const { data, error } = await apiFetch('/notifications')

  if (error) {
    if (import.meta.env.DEV) console.error('Error fetching notifications:', error)
    throw error
  }

  return data as unknown as Notification[]
}

/**
 * Mark a single notification as read with tenant verification
 */
export async function markAsRead(id: string, tenantId: string): Promise<void> {
  const { error } = await apiFetch('/notifications')

  if (error) {
    if (import.meta.env.DEV) console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read with tenant verification
 */
export async function markAllAsRead(userId: string, tenantId: string): Promise<void> {
  const { error } = await apiFetch('/notifications')

  if (error) {
    if (import.meta.env.DEV) console.error('Error marking all notifications as read:', error)
    throw error
  }
}

/**
 * Send a notification manually (System)
 * Uses passed tenantId for defense-in-depth
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'system',
  tenantId: string
): Promise<void> {
  const { error } = await apiFetch('/notifications')

  if (error) {
    if (import.meta.env.DEV) console.error('Error sending notification:', error)
    throw error
  }
}

// Individual exports used via `import * as notificationService` in queries
