/**
 * Enhanced notification API with pagination, unread count, and preferences
 * All queries include tenant_id for multi-tenant isolation
 */

import { db } from "@/services/db";
import { logDevError } from "@/utils/logDevError";

import type { Notification, NotificationPreferences } from "../types";

// Only select columns that exist in the baseline notifications table.
// The 003_notifications migration's CREATE TABLE IF NOT EXISTS is a no-op
// when the baseline table already exists, so body/metadata/read_at are absent.
const NOTIFICATION_COLUMNS = `
  id,
  tenant_id,
  user_id,
  actor_id,
  type,
  title,
  message,
  is_read,
  created_at,
  link
`;

/**
 * Fetch paginated notifications for a user within a tenant
 */
export async function fetchNotifications(
  userId: string,
  tenantId: string,
  limit = 50,
  offset = 0,
): Promise<Notification[]> {
  const { data, error } = await db
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  if (error) {
    logDevError("notifications", "fetchNotifications error:", error);
    throw error;
  }

  return (data ?? []) as Notification[];
}

/**
 * Mark a single notification as read
 * FIXED: Added tenantId + userId filters to prevent cross-user/cross-tenant updates
 */
export async function markNotificationRead(
  id: string,
  userId: string,
  tenantId: string,
): Promise<void> {
  // Only update is_read — read_at column may not exist in baseline schema
  // FIXED: Scoped to tenant_id + user_id so a user cannot mark another user's notification as read
  const { error } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (error) {
    logDevError("notifications", "markNotificationRead error:", error);
    throw error;
  }
}

/**
 * Mark all unread notifications as read for a user within a tenant
 */
export async function markAllNotificationsRead(
  userId: string,
  tenantId: string,
): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("is_read", false);

  if (error) {
    logDevError("notifications", "markAllNotificationsRead error:", error);
    throw error;
  }
}

/**
 * Fetch the count of unread notifications
 */
export async function fetchUnreadCount(
  userId: string,
  tenantId: string,
): Promise<number> {
  const { count, error } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("is_read", false);

  if (error) {
    logDevError("notifications", "fetchUnreadCount error:", error);
    throw error;
  }

  return count ?? 0;
}

/**
 * Fetch notification preferences for a user within a tenant
 */
export async function fetchNotificationPreferences(
  userId: string,
  tenantId: string,
): Promise<NotificationPreferences | null> {
  const { data, error } = await db
    .from("notification_preferences")
    .select(
      "id, tenant_id, user_id, email_enabled, push_enabled, quiet_hours_start, quiet_hours_end, disabled_types, push_subscription",
    )
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    logDevError("notifications", "fetchNotificationPreferences error:", error);
    throw error;
  }

  return data as NotificationPreferences | null;
}

/**
 * Upsert notification preferences for a user
 */
export async function upsertNotificationPreferences(
  prefs: Partial<NotificationPreferences> & {
    user_id: string;
    tenant_id: string;
  },
): Promise<NotificationPreferences> {
  const { data, error } = await db
    .from("notification_preferences")
    .upsert(prefs, { onConflict: "user_id,tenant_id" })
    .select(
      "id, tenant_id, user_id, email_enabled, push_enabled, quiet_hours_start, quiet_hours_end, disabled_types, push_subscription",
    )
    .single();

  if (error) {
    logDevError("notifications", "upsertNotificationPreferences error:", error);
    throw error;
  }

  return data as NotificationPreferences;
}
