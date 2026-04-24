-- 029_add_admin_notification_types.sql
-- Add admin-targeted notification enum values so that useAdminNotifications can
-- filter by these types without triggering a PG enum parse error (22P02).
--
-- Before this migration, notification_type only had legacy uppercase labels
-- (ANNOUNCEMENT, ASSIGNMENT, GRADE, INFO, QUIZ, SUCCESS, WARNING). The
-- frontend's ADMIN_NOTIFICATION_TYPES sends lowercase labels:
--   invitation_accepted, moderation_report, sync_failure, system_alert, user_joined
-- which caused /api/v1/data/notifications SELECTs with .in('type', [...]) to
-- 500 with "invalid input value for enum notification_type".
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent and safe to re-run.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invitation_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'moderation_report';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sync_failure';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system_alert';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'user_joined';
