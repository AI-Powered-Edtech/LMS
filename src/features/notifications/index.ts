/**
 * Notifications Feature Module
 */

// Types
export type { Notification, NotificationPreferences, NotificationType } from './types'

// API
export * from './api/notificationApi'

// Hooks — primary enhanced hooks
export {
  notificationKeys,
  useNotificationPreferences,
  useNotifications,
} from './hooks/useNotifications'

// Push subscription hook
export type { UsePushSubscriptionReturn } from './hooks/usePushSubscription'
export { usePushSubscription } from './hooks/usePushSubscription'

// Legacy query hooks (used by NotificationCenter, Header, Creator, Assignments)
// Note: useNotifications is NOT re-exported from notificationQueries to avoid conflict
export { useMarkAllAsRead, useMarkAsRead, useSendNotification } from './queries/notificationQueries'

// Components
export { NotificationBell } from './components/NotificationBell'
export { NotificationPanel } from './components/NotificationPanel'
export { NotificationPreferencesPanel } from './components/NotificationPreferencesPanel'
export { PushPermissionPrompt } from './components/PushPermissionPrompt'
