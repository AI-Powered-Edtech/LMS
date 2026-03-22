/**
 * Enhanced notification API with pagination, unread count, and preferences
 * All queries include tenant_id for multi-tenant isolation
 */

import { supabase } from '@/src/services/supabase/client'
import type { Notification, NotificationPreferences } from '../types'

const NOTIFICATION_COLUMNS = `
  id,
  tenant_id,
  user_id,
  actor_id,
  type,
  title,
  body,
  message,
  metadata,
  is_read,
  read_at,
  created_at,
  link
`

/**
 * Fetch paginated notifications for a user within a tenant
 */
export async function fetchNotifications(
  userId: string,
  tenantId: string,
  limit = 50,
  offset = 0
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (error) {
    if (import.meta.env.DEV) console.error('fetchNotifications error:', error)
    throw error
  }

  return (data ?? []) as Notification[]
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    if (import.meta.env.DEV) console.error('markNotificationRead error:', error)
    throw error
  }
}

/**
 * Mark all unread notifications as read for a user within a tenant
 */
export async function markAllNotificationsRead(userId: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('is_read', false)

  if (error) {
    if (import.meta.env.DEV) console.error('markAllNotificationsRead error:', error)
    throw error
  }
}

/**
 * Fetch the count of unread notifications
 */
export async function fetchUnreadCount(userId: string, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('is_read', false)

  if (error) {
    if (import.meta.env.DEV) console.error('fetchUnreadCount error:', error)
    throw error
  }

  return count ?? 0
}

/**
 * Fetch notification preferences for a user within a tenant
 */
export async function fetchNotificationPreferences(
  userId: string,
  tenantId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select(
      'id, tenant_id, user_id, email_enabled, push_enabled, quiet_hours_start, quiet_hours_end, disabled_types, push_subscription'
    )
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    if (import.meta.env.DEV) console.error('fetchNotificationPreferences error:', error)
    throw error
  }

  return data as NotificationPreferences | null
}

/**
 * Upsert notification preferences for a user
 */
export async function upsertNotificationPreferences(
  prefs: Partial<NotificationPreferences> & { user_id: string; tenant_id: string }
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(prefs, { onConflict: 'user_id,tenant_id' })
    .select(
      'id, tenant_id, user_id, email_enabled, push_enabled, quiet_hours_start, quiet_hours_end, disabled_types, push_subscription'
    )
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('upsertNotificationPreferences error:', error)
    throw error
  }

  return data as NotificationPreferences
}
