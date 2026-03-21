/**
 * Notification type definitions
 * Extracted from notificationService.ts for the notifications feature module
 */

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  actor_id: string | null
  title: string
  message: string
  type: 'grade' | 'discussion_reply' | 'announcement' | 'system'
  entity_id: string | null
  link: string | null
  is_read: boolean
  created_at: string
  actor?: {
    full_name: string
    avatar_url: string | null
  }
}
