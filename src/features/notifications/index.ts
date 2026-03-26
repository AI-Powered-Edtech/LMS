/**
 * Notifications Feature Module
 */

// Types
export type { Notification, NotificationType, NotificationPreferences } from './types'

// API
export * from './api/notificationApi'

// Hooks — primary enhanced hooks
export {
  useNotifications,
  useNotificationPreferences,
  notificationKeys,
} from './hooks/useNotifications'

// Legacy query hooks (used by NotificationCenter, Header, Creator, Assignments)
// Note: useNotifications is NOT re-exported from notificationQueries to avoid conflict
export { useMarkAsRead, useMarkAllAsRead, useSendNotification } from './queries/notificationQueries'

// Components
export { NotificationBell } from './components/NotificationBell'
export { NotificationPanel } from './components/NotificationPanel'
export { NotificationPreferencesPanel } from './components/NotificationPreferencesPanel'
