/**
 * @deprecated Use src/features/notifications instead
 * 
 * This is a shim for backward compatibility.
 * All new code should import directly from the notifications feature module:
 * 
 *   import { notificationService } from '@/src/features/notifications';
 *   import type { Notification } from '@/src/features/notifications';
 *   import { useNotifications, useMarkAsRead, useMarkAllAsRead, useSendNotification } from '@/src/features/notifications';
 */

export { notificationService } from '@/src/features/notifications';
export type { Notification } from '@/src/features/notifications';
