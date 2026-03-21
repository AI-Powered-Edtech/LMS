/**
 * Notification type definitions for the notifications feature module
 */

export type NotificationType =
  | 'grade_posted'
  | 'assignment_due'
  | 'quiz_available'
  | 'announcement'
  | 'course_enrolled'
  | 'badge_earned'
  | 'discussion_reply'
  | 'system'
  // Legacy types kept for backward compatibility with existing data
  | 'grade'

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  title: string
  /** Primary body text (new schema) */
  body: string | null
  /** Legacy message field — used by NotificationCenter */
  message: string
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
  /** Legacy link field — used by NotificationCenter */
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
