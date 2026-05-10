/**
 * Shared Valibot schemas for database row validation.
 *
 * Uses `v.looseObject()` so extra columns / join data pass through
 * without failing validation. Only the *critical* fields are checked.
 *
 * Convention:
 *  - XxxRowSchema  → validates a single row from table xxx
 *  - XxxRpcSchema  → validates the result of an RPC call
 */
import * as v from "valibot";

// ── Common field schemas ──────────────────────────────────────────────────

const uuid = v.pipe(v.string(), v.uuid());
const nullableString = v.nullable(v.string());
const nullableNumber = v.nullable(v.number());
const optTimestamp = v.optional(v.nullable(v.string()));

// ── Course ────────────────────────────────────────────────────────────────

export const CourseRowSchema = v.looseObject({
  id: uuid,
  title: v.string(),
  description: nullableString,
  status: v.picklist([
    "draft",
    "in_review",
    "approved",
    "published",
    "archived",
  ]),
  tenant_id: uuid,
  published_at: optTimestamp,
  updated_at: optTimestamp,
  created_at: optTimestamp,
});

export type CourseRow = v.InferOutput<typeof CourseRowSchema>;

// ── Module ────────────────────────────────────────────────────────────────

export const ModuleRowSchema = v.looseObject({
  id: uuid,
  course_id: uuid,
  title: v.string(),
  order: v.number(),
  tenant_id: uuid,
  lessons: v.optional(v.array(v.lazy(() => LessonRowSchema))),
});

export type ModuleRow = v.InferOutput<typeof ModuleRowSchema>;

// ── Lesson ────────────────────────────────────────────────────────────────

export const LessonRowSchema = v.looseObject({
  id: uuid,
  module_id: uuid,
  title: v.string(),
  type: v.string(),
  order: v.number(),
  is_published: v.boolean(),
  duration_minutes: nullableNumber,
  passing_score: nullableNumber,
  tenant_id: uuid,
});

export type LessonRow = v.InferOutput<typeof LessonRowSchema>;

// ── Block / Lesson Resource ───────────────────────────────────────────────

export const BlockRowSchema = v.looseObject({
  id: uuid,
  lesson_id: uuid,
  type: v.string(),
  url: nullableString,
  title: nullableString,
  content: nullableString,
  metadata: v.record(v.string(), v.unknown()),
  order_index: v.number(),
  tenant_id: uuid,
});

export type BlockRow = v.InferOutput<typeof BlockRowSchema>;

// ── Classroom ─────────────────────────────────────────────────────────────

export const ClassroomRowSchema = v.looseObject({
  id: uuid,
  name: v.string(),
  teacher_id: uuid,
  join_code: v.string(),
  created_at: v.string(),
});

export type ClassroomRow = v.InferOutput<typeof ClassroomRowSchema>;

// ── Enrollment ────────────────────────────────────────────────────────────

export const EnrollmentRowSchema = v.looseObject({
  class_id: uuid,
});

export type EnrollmentRow = v.InferOutput<typeof EnrollmentRowSchema>;

// ── Quiz ──────────────────────────────────────────────────────────────────

export const QuizRowSchema = v.looseObject({
  id: uuid,
  title: v.optional(v.string()),
  status: v.optional(v.string()),
  tenant_id: v.optional(uuid),
  created_at: optTimestamp,
});

export type QuizRow = v.InferOutput<typeof QuizRowSchema>;

// ── Quiz Question ─────────────────────────────────────────────────────────

export const QuizQuestionRowSchema = v.looseObject({
  id: uuid,
  text: v.string(),
  order: v.optional(v.number()),
});

export type QuizQuestionRow = v.InferOutput<typeof QuizQuestionRowSchema>;

// ── Quiz Option ───────────────────────────────────────────────────────────

export const QuizOptionRowSchema = v.looseObject({
  id: uuid,
  text: v.string(),
});

export type QuizOptionRow = v.InferOutput<typeof QuizOptionRowSchema>;

// ── Quiz Attempt ──────────────────────────────────────────────────────────

export const QuizAttemptRowSchema = v.looseObject({
  id: uuid,
  quiz_id: uuid,
  student_id: uuid,
  status: v.string(),
  score: nullableNumber,
  started_at: v.optional(v.string()),
  tenant_id: uuid,
});

export type QuizAttemptRow = v.InferOutput<typeof QuizAttemptRowSchema>;

// ── Quiz Assignment ───────────────────────────────────────────────────────

export const QuizAssignmentRowSchema = v.looseObject({
  id: uuid,
  quiz_id: uuid,
  class_id: uuid,
  tenant_id: uuid,
  status: v.optional(v.string()),
});

export type QuizAssignmentRow = v.InferOutput<typeof QuizAssignmentRowSchema>;

// ── Quiz Stats ────────────────────────────────────────────────────────────

export const QuizStatsRowSchema = v.looseObject({
  quiz_id: uuid,
  total_attempts: v.number(),
  avg_score: v.number(),
});

export type QuizStatsRow = v.InferOutput<typeof QuizStatsRowSchema>;

// ── Question Stats ────────────────────────────────────────────────────────

export const QuestionStatsRowSchema = v.looseObject({
  id: uuid,
  question_id: uuid,
  quiz_id: uuid,
  total_answers: v.number(),
  correct_answers: v.number(),
  difficulty_rate: v.number(),
});

export type QuestionStatsRow = v.InferOutput<typeof QuestionStatsRowSchema>;

// ── Cheating Signal ───────────────────────────────────────────────────────

export const CheatingSignalRowSchema = v.looseObject({
  id: uuid,
  attempt_id: uuid,
  signal_type: v.string(),
  created_at: v.string(),
});

export type CheatingSignalRow = v.InferOutput<typeof CheatingSignalRowSchema>;

// ── Discussion ────────────────────────────────────────────────────────────

export const DiscussionRowSchema = v.looseObject({
  id: uuid,
  tenant_id: uuid,
  author_id: uuid,
  content: v.string(),
  is_pinned: v.boolean(),
  is_deleted: v.boolean(),
  created_at: v.string(),
});

export type DiscussionRow = v.InferOutput<typeof DiscussionRowSchema>;

// ── Announcement ──────────────────────────────────────────────────────────

export const AnnouncementRowSchema = v.looseObject({
  id: uuid,
  tenant_id: uuid,
  title: v.string(),
  content: v.string(),
  status: v.optional(v.string()),
  created_at: v.string(),
});

export type AnnouncementRow = v.InferOutput<typeof AnnouncementRowSchema>;

// ── Announcement RSVP ─────────────────────────────────────────────────────

export const AnnouncementRsvpRowSchema = v.looseObject({
  id: uuid,
  announcement_id: uuid,
  user_id: uuid,
  response: v.picklist(["yes", "no", "maybe"]),
});

export type AnnouncementRsvpRow = v.InferOutput<
  typeof AnnouncementRsvpRowSchema
>;

// ── Assignment ────────────────────────────────────────────────────────────

export const AssignmentRowSchema = v.looseObject({
  id: uuid,
  tenant_id: uuid,
  title: v.string(),
  lesson_id: v.optional(uuid),
  course_id: v.optional(uuid),
});

export type AssignmentRow = v.InferOutput<typeof AssignmentRowSchema>;

// ── Assignment Submission ─────────────────────────────────────────────────

export const AssignmentSubmissionRowSchema = v.looseObject({
  id: uuid,
  assignment_id: uuid,
  student_id: uuid,
  status: v.picklist(["draft", "submitted", "graded", "returned"]),
});

export type AssignmentSubmissionRow = v.InferOutput<
  typeof AssignmentSubmissionRowSchema
>;

// ── User Streak ───────────────────────────────────────────────────────────

export const UserStreakRowSchema = v.looseObject({
  user_id: uuid,
  tenant_id: uuid,
  current_streak: v.number(),
  longest_streak: v.number(),
});

export type UserStreakRow = v.InferOutput<typeof UserStreakRowSchema>;

// ── Badge ─────────────────────────────────────────────────────────────────

export const BadgeRowSchema = v.looseObject({
  id: uuid,
  name: v.string(),
  description: nullableString,
});

export type BadgeRow = v.InferOutput<typeof BadgeRowSchema>;

// ── Badge Definition ──────────────────────────────────────────────────────

export const BadgeDefinitionRowSchema = v.looseObject({
  id: uuid,
  name: v.string(),
  badge_type: v.string(),
  is_active: v.boolean(),
});

export type BadgeDefinitionRow = v.InferOutput<typeof BadgeDefinitionRowSchema>;

// ── Leaderboard Entry ─────────────────────────────────────────────────────

export const LeaderboardRowSchema = v.looseObject({
  user_id: uuid,
  rank: v.optional(v.number()),
});

export type LeaderboardRow = v.InferOutput<typeof LeaderboardRowSchema>;

// ── Notification ──────────────────────────────────────────────────────────

export const NotificationRowSchema = v.looseObject({
  id: uuid,
  tenant_id: uuid,
  user_id: uuid,
  is_read: v.boolean(),
  created_at: v.string(),
});

export type NotificationRow = v.InferOutput<typeof NotificationRowSchema>;

// ── Notification Preferences ──────────────────────────────────────────────

export const NotificationPrefsRowSchema = v.looseObject({
  id: uuid,
  tenant_id: uuid,
  user_id: uuid,
  email_enabled: v.optional(v.boolean()),
  push_enabled: v.optional(v.boolean()),
});

export type NotificationPrefsRow = v.InferOutput<
  typeof NotificationPrefsRowSchema
>;

// ── Course Stats ──────────────────────────────────────────────────────────

export const CourseStatsRowSchema = v.looseObject({
  course_id: uuid,
  tenant_id: uuid,
  total_enrolled: v.number(),
  active_students: v.number(),
  avg_progress: v.number(),
  avg_quiz_score: v.number(),
});

export type CourseStatsRow = v.InferOutput<typeof CourseStatsRowSchema>;

// ── Tenant Module ─────────────────────────────────────────────────────────

export const TenantModuleRowSchema = v.looseObject({
  id: uuid,
  tenant_id: v.optional(uuid),
  module_id: v.optional(uuid),
  is_enabled: v.boolean(),
});

export type TenantModuleRow = v.InferOutput<typeof TenantModuleRowSchema>;

// ── Content Report ────────────────────────────────────────────────────────

export const ContentReportRowSchema = v.looseObject({
  id: uuid,
  content_id: v.string(),
  content_type: v.string(),
  reporter_id: uuid,
  reason: v.string(),
  status: v.string(),
});

export type ContentReportRow = v.InferOutput<typeof ContentReportRowSchema>;

// ── Onboarding Progress ───────────────────────────────────────────────────

export const OnboardingProgressRowSchema = v.looseObject({
  step: v.string(),
});

export type OnboardingProgressRow = v.InferOutput<
  typeof OnboardingProgressRowSchema
>;

// ── Lesson Progress ───────────────────────────────────────────────────────

export const LessonProgressRowSchema = v.looseObject({
  id: v.optional(uuid),
  user_id: uuid,
  lesson_id: uuid,
  status: v.optional(v.string()),
});

export type LessonProgressRow = v.InferOutput<typeof LessonProgressRowSchema>;

// ── Gradebook Entry ───────────────────────────────────────────────────────

export const GradebookEntryRowSchema = v.looseObject({
  id: uuid,
  tenant_id: uuid,
  student_id: uuid,
  course_id: uuid,
  score: nullableNumber,
  max_score: v.number(),
});

export type GradebookEntryRow = v.InferOutput<typeof GradebookEntryRowSchema>;

// ── Gradebook Settings ────────────────────────────────────────────────────

export const GradebookSettingsRowSchema = v.looseObject({
  id: uuid,
  tenant_id: uuid,
  course_id: uuid,
});

export type GradebookSettingsRow = v.InferOutput<
  typeof GradebookSettingsRowSchema
>;

// ── Comment / Discussion Post ─────────────────────────────────────────────

export const DiscussionPostRowSchema = v.looseObject({
  id: uuid,
  content: v.string(),
  created_at: v.string(),
  author_id: uuid,
});

export type DiscussionPostRow = v.InferOutput<typeof DiscussionPostRowSchema>;

// ── Tenant Invitation ─────────────────────────────────────────────────────

export const TenantInvitationRowSchema = v.looseObject({
  id: uuid,
  email: v.string(),
  role: v.string(),
  status: v.string(),
  token: v.string(),
});

export type TenantInvitationRow = v.InferOutput<
  typeof TenantInvitationRowSchema
>;

// ── Storage Object ────────────────────────────────────────────────────────

export const StorageObjectRowSchema = v.looseObject({
  id: uuid,
  bucket: v.string(),
  object_path: v.string(),
});

export type StorageObjectRow = v.InferOutput<typeof StorageObjectRowSchema>;

// ── Calendar Schedule ─────────────────────────────────────────────────────

export const ClassScheduleRowSchema = v.looseObject({
  id: uuid,
  day: v.string(),
  start_time: v.string(),
  end_time: v.string(),
});

export type ClassScheduleRow = v.InferOutput<typeof ClassScheduleRowSchema>;

// ── Generic RPC result (for RPCs returning typed JSON) ────────────────────

/** Use for RPCs that return a single object — validates it has at least id */
export const RpcRowSchema = v.looseObject({
  id: v.optional(v.string()),
});

/** Use for RPCs returning unknown shaped data */
export const RpcResultSchema = v.unknown();
