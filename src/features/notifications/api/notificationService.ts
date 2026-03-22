/**
 * Notification service with multi-tenant security
 * All functions accept tenantId for defense-in-depth tenant isolation
 */

import { supabase } from '@/src/lib/supabase'
import type { Notification } from '../types'

/**
 * Fetch user notifications with tenant isolation
 */
export async function fetchNotifications(
  userId: string,
  tenantId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
            *,
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
    if (import.meta.env.DEV) console.error('Error fetching notifications:', error)
    throw error
  }

  return data as Notification[]
}

/**
 * Mark a single notification as read with tenant verification
 */
export async function markAsRead(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    if (import.meta.env.DEV) console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read with tenant verification
 */
export async function markAllAsRead(userId: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('is_read', false)

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
  const { error } = await supabase.from('notifications').insert({
    tenant_id: tenantId,
    user_id: userId,
    title,
    message,
    type,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('Error sending notification:', error)
    throw error
  }
}

/**
 * Subscribe to real-time notifications
 * Filters by both user_id AND tenant_id for multi-tenant isolation
 */
export function subscribe(
  userId: string,
  tenantId: string,
  onNewNotification: (notification: Notification) => void
): { unsubscribe: () => void } {
  const channel = supabase
    .channel(`notifications:${userId}:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId},tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        onNewNotification(payload.new as Notification)
      }
    )
    .subscribe()

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

// Individual exports used via `import * as notificationService` in queries
