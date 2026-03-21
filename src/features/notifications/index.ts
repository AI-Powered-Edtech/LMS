/**
 * Notifications Feature Module
 */

export type { Notification } from './types'
export {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useSendNotification,
} from './queries/notificationQueries'
