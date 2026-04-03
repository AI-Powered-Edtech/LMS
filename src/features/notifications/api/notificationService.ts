/**
 * Notification service with multi-tenant security
 * All functions accept tenantId for defense-in-depth tenant isolation
 */

import { supabase } from '@/services/supabase/client'

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
    if (import.meta.env.DEV) console.error('Error fetching notifications:', error)
    throw error
  }

  return data as unknown as Notification[]
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
 * FIXED: Use RPC `create_notification` instead of direct INSERT to enforce server-side
 * role checks and avoid requiring INSERT privilege on `notifications` for authenticated role.
 * The RPC is SECURITY DEFINER and validates the caller's role before inserting.
 *
 * TODO (migration): If `create_notification` RPC does not exist yet, create:
 *   CREATE OR REPLACE FUNCTION public.create_notification(
 *     p_user_id UUID, p_tenant_id UUID, p_title TEXT, p_message TEXT, p_type TEXT
 *   ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   BEGIN
 *     -- Only TEACHER/ADMIN can create notifications for other users
 *     IF NOT EXISTS (SELECT 1 FROM public.user_roles ur
 *       WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id
 *         AND UPPER(ur.role::text) IN ('TEACHER','ADMIN')) THEN
 *       RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
 *     END IF;
 *     INSERT INTO public.notifications(tenant_id, user_id, title, message, type)
 *     VALUES (p_tenant_id, p_user_id, p_title, p_message, p_type);
 *   END;
 *   $$;
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'system',
  tenantId: string
): Promise<void> {
  // FIXED: Use RPC instead of direct INSERT — server-side role check enforced
  const { error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_title: title,
    p_message: message,
    p_type: type,
  })

  if (error) {
    // PGRST202 = RPC function not found (migration not yet deployed).
    // Fall back to direct INSERT so notification creation does not fail hard
    // while the migration is pending. Remove this fallback once
    // create_notification is confirmed deployed on all environments.
    if (error.code === 'PGRST202') {
      if (import.meta.env.DEV)
        console.warn(
          '[notificationService] create_notification RPC not found — falling back to direct INSERT. Run the pending migration to restore server-side role checks.',
          error
        )
      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: userId,
        tenant_id: tenantId,
        title,
        message,
        type,
      })
      if (insertError) {
        if (import.meta.env.DEV)
          console.error('[notificationService] Fallback INSERT failed:', insertError)
        throw insertError
      }
      return
    }
    if (import.meta.env.DEV)
      console.error('Error sending notification via RPC (create_notification):', error)
    throw error
  }
}

// Individual exports used via `import * as notificationService` in queries
