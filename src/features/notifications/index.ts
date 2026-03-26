/**
 * Notifications Feature Module
 */

// Types
<<<<<<< Updated upstream
export type { Notification, NotificationPreferences, NotificationType } from './types'
=======
export type { Notification, NotificationPreferences,NotificationType } from './types'
>>>>>>> Stashed changes

// API
export * from './api/notificationApi'

// Hooks — primary enhanced hooks
export {
  notificationKeys,
  useNotificationPreferences,
  useNotifications,
} from './hooks/useNotifications'

// Legacy query hooks (used by NotificationCenter, Header, Creator, Assignments)
// Note: useNotifications is NOT re-exported from notificationQueries to avoid conflict
export { useMarkAllAsRead, useMarkAsRead, useSendNotification } from './queries/notificationQueries'

// Components
export { NotificationBell } from './components/NotificationBell'
export { NotificationPanel } from './components/NotificationPanel'
export { NotificationPreferencesPanel } from './components/NotificationPreferencesPanel'
