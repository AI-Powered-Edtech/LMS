/**
 * Notification type definitions for the notifications feature module
 */

export type NotificationType =
  | 'grade_posted'
  | 'assignment_due'
  | 'quiz_available'
  | 'quiz_result'
  | 'announcement'
  | 'course_enrolled'
  | 'badge_earned'
  | 'discussion_reply'
  | 'message_received'
  | 'system'
  // Legacy types kept for backward compatibility with existing data
  | 'grade'
  // Admin-specific notification types
  | 'invitation_accepted'
  | 'moderation_report'
  | 'sync_failure'
  | 'system_alert'
  | 'user_joined'

/** Admin-specific notification event types */
export type AdminNotificationType =
  | 'invitation_accepted'
  | 'moderation_report'
  | 'sync_failure'
  | 'system_alert'
  | 'user_joined'

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  title: string
  /** Message text — maps to baseline 'message' column */
  message: string
  is_read: boolean
  created_at: string
  /** Navigation link — used by NotificationCenter */
  link: string | null
  actor?: {
    full_name: string
    avatar_url: string | null
  }
}

export interface NotificationPreferences {
  id: string
  tenant_id: string
  user_id: string
  email_enabled: boolean
  push_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  disabled_types: NotificationType[]
  push_subscription: unknown | null
}
