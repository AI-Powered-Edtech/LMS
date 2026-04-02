/**
 * Notifications Feature Module
 */

// Types
export type {
  AdminNotificationType,
  Notification,
  NotificationPreferences,
  NotificationType,
} from './types'

// API
export * from './api/notificationApi'

// Hooks — primary enhanced hooks
export {
  notificationKeys,
  useNotificationPreferences,
  useNotifications,
} from './hooks/useNotifications'

// Admin Notification hooks
export type { UseAdminNotificationsReturn } from './hooks/useAdminNotifications'
export {
  ADMIN_NOTIFICATION_TYPES,
  adminNotificationKeys,
  useAdminNotifications,
} from './hooks/useAdminNotifications'

// Push subscription hook
export type { UsePushSubscriptionReturn } from './hooks/usePushSubscription'
export { usePushSubscription } from './hooks/usePushSubscription'

// Legacy query hooks (used by NotificationCenter, Header, Creator, Assignments)
// Note: useNotifications is NOT re-exported from notificationQueries to avoid conflict
export { useMarkAllAsRead, useMarkAsRead, useSendNotification } from './queries/notificationQueries'

// Local (localStorage-backed) notification preferences hook
export type {
  ChannelPrefs,
  NotificationChannel,
  NotificationPrefsMap,
  NotificationPrefType,
  UseNotificationPreferencesLocalReturn,
} from './hooks/useNotificationPreferences'
export {
  DEFAULT_PREFS,
  PREF_TYPE_LABELS,
  useNotificationPreferencesLocal,
} from './hooks/useNotificationPreferences'

// Notification formatter utilities
export type {
  DateGroup,
  FormattedNotification,
  NotificationMeta,
} from './utils/notificationFormatter'
export {
  formatEventNotification,
  formatNotificationMessage,
  getDateGroup,
  NOTIFICATION_TYPE_COLOR,
  NOTIFICATION_TYPE_LABEL,
  relativeTime,
} from './utils/notificationFormatter'

// Components
export { AdminNotificationBell } from './components/AdminNotificationBell'
export { NotificationBell } from './components/NotificationBell'
export { NotificationCenter } from './components/NotificationCenter'
export { NotificationPanel } from './components/NotificationPanel'
export { NotificationPreferencesPanel } from './components/NotificationPreferencesPanel'
export { PushPermissionPrompt } from './components/PushPermissionPrompt'
