// ==========================================================================
// Digest Settings API — digestSettingsApi.ts
// Wave 4 — Task 29.4: Daily Digest Notification
//
// Re-export dari notifications/api/digestApi untuk kemudahan import
// dalam fitur parent. Tambahan: triggerManualDigest dengan child context.
// ==========================================================================

export {
  type DigestChannel,
  type DigestSettings,
  type DigestSettingsUpdate,
  getDigestSettings,
  triggerManualDigest,
  updateDigestSettings,
} from '@/features/notifications/api/digestApi'
