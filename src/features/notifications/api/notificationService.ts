/**
 * Notification service with multi-tenant security
 * All functions accept tenantId for defense-in-depth tenant isolation
 */

import { db } from '@/services/db'
import { logger } from '@/utils/logger'

import type { Notification } from '../types'

/**
 * Fetch user notifications with tenant isolation
 */
export async function fetchNotifications(
  userId: string,
  tenantId: string
): Promise<Notification[]> {
  const { data, error } = await db
    .from('notifications')
    .select(
      `
            id, user_id, tenant_id, title, message, type, is_read, created_at, actor_id, link,
            actor:actor_id (
                full_name,
                avatar_url
            )
        `
    )
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    if (import.meta.env.DEV) logger.error('Error fetching notifications:', error)
    throw error
  }

  return data as unknown as Notification[]
}

/**
 * Mark a single notification as read with tenant verification
 */
export async function markAsRead(id: string, tenantId: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    if (import.meta.env.DEV) logger.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read with tenant verification
 */
export async function markAllAsRead(userId: string, tenantId: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    if (import.meta.env.DEV) logger.error('Error marking all notifications as read:', error)
    throw error
  }
}

/**
 * Send a notification manually (System)
 * Uses RPC `create_notification` (defined in migration 003_notifications.sql).
 * The RPC is SECURITY DEFINER and respects notification_preferences (skips disabled types).
 * Fails hard if the RPC is unavailable to avoid bypassing server-side checks.
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'system',
  tenantId: string
): Promise<void> {
  const { error } = await db.rpc('create_notification', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_title: title,
    p_message: message,
    p_type: type,
  })

  if (error) {
    if (error.code === 'PGRST202') {
      if (import.meta.env.DEV)
        logger.warn(
          '[notificationService] create_notification RPC not found. Jalankan migrasi notification RPC sebelum mengirim notifikasi.',
          error
        )
      throw new Error(
        'Fungsi create_notification belum tersedia di database. Deploy migrasi yang relevan terlebih dahulu.'
      )
    }
    if (import.meta.env.DEV)
      logger.error('Error sending notification via RPC (create_notification):', error)
    throw error
  }
}

// Individual exports used via `import * as notificationService` in queries
