/**
 * notificationFormatter — format notification messages into localized, human-readable text.
 *
 * Converts raw notification type + metadata into user-facing text.
 * Handles event types from both student/teacher and admin contexts.
 */

import i18n from "@/i18n";

import type { NotificationType } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationMeta {
  /** Actor / sender display name */
  actorName?: string;
  /** Course or class name */
  courseName?: string;
  /** Assignment title */
  assignmentTitle?: string;
  /** Quiz title */
  quizTitle?: string;
  /** Score value (0–100) */
  score?: number;
  /** Badge name for gamification */
  badgeName?: string;
  /** Reply thread or post title */
  threadTitle?: string;
  /** Any additional context string */
  context?: string;
}

export interface FormattedNotification {
  /** Short title for the notification (1 line) */
  title: string;
  /** Longer descriptive body message */
  body: string;
  /** Aria label combining title + body for screen readers */
  ariaLabel: string;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

/** Icon color class per notification type for visual hints */
export const NOTIFICATION_TYPE_COLOR: Partial<
  Record<NotificationType, string>
> = {
  grade_posted: "text-green-500",
  grade: "text-green-500",
  assignment_due: "text-orange-500",
  quiz_available: "text-purple-500",
  quiz_result: "text-purple-500",
  announcement: "text-blue-500",
  course_enrolled: "text-indigo-500",
  badge_earned: "text-yellow-500",
  discussion_reply: "text-teal-500",
  message_received: "text-cyan-500",
  system: "text-slate-500",
  system_alert: "text-yellow-500",
  invitation_accepted: "text-green-500",
  moderation_report: "text-red-500",
  sync_failure: "text-orange-500",
  user_joined: "text-blue-500",
};

const TYPE_LABEL_KEYS: Record<NotificationType, string> = {
  grade_posted: "notifications.formatter.typeLabels.gradePosted",
  grade: "notifications.formatter.typeLabels.grade",
  assignment_due: "notifications.formatter.typeLabels.assignmentDue",
  quiz_available: "notifications.formatter.typeLabels.quizAvailable",
  quiz_result: "notifications.formatter.typeLabels.quizResult",
  announcement: "notifications.formatter.typeLabels.announcement",
  course_enrolled: "notifications.formatter.typeLabels.courseEnrolled",
  badge_earned: "notifications.formatter.typeLabels.badgeEarned",
  discussion_reply: "notifications.formatter.typeLabels.discussionReply",
  message_received: "notifications.formatter.typeLabels.messageReceived",
  system: "notifications.formatter.typeLabels.system",
  system_alert: "notifications.formatter.typeLabels.systemAlert",
  invitation_accepted: "notifications.formatter.typeLabels.invitationAccepted",
  moderation_report: "notifications.formatter.typeLabels.moderationReport",
  sync_failure: "notifications.formatter.typeLabels.syncFailure",
  user_joined: "notifications.formatter.typeLabels.userJoined",
};

function tt(key: string, vars?: Record<string, string | number>): string {
  let value = i18n.t(key);
  if (typeof value !== "string") value = String(value);
  if (!vars) return value;
  return Object.entries(vars).reduce(
    (text, [name, replacement]) =>
      text.replaceAll(`__${name.toUpperCase()}__`, String(replacement)),
    value,
  );
}

/** Short localized type label. Kept as a getter-backed object for export compatibility. */
export const NOTIFICATION_TYPE_LABEL = Object.fromEntries(
  Object.entries(TYPE_LABEL_KEYS).map(([type, key]) => [type, tt(key)]),
) as Record<NotificationType, string>;

// ─── Event type formatter (from telemetry / event bus) ────────────────────────

type LMSEventType =
  | "LESSON_COMPLETED"
  | "QUIZ_COMPLETED"
  | "ASSIGNMENT_SUBMITTED"
  | "CLASS_JOINED"
  | "AI_TUTOR_INTERACTION"
  | "INVITATION_ACCEPTED"
  | "MODERATION_REPORT"
  | "SYNC_FAILURE"
  | "SYSTEM_ALERT"
  | "USER_JOINED";

/**
 * Format a system event type into a human-readable localized notification message.
 * Used when generating notifications from the event bus.
 */
export function formatEventNotification(
  eventType: LMSEventType,
  meta: NotificationMeta = {},
): FormattedNotification {
  const { actorName, courseName, assignmentTitle, quizTitle, score, context } =
    meta;

  switch (eventType) {
    case "LESSON_COMPLETED":
      return {
        title: tt("notifications.formatter.events.lessonCompleted.title"),
        body: courseName
          ? tt(
              "notifications.formatter.events.lessonCompleted.bodyWithCourse",
              { course: courseName },
            )
          : tt("notifications.formatter.events.lessonCompleted.body"),
        ariaLabel: courseName
          ? tt(
              "notifications.formatter.events.lessonCompleted.ariaWithCourse",
              { course: courseName },
            )
          : tt("notifications.formatter.events.lessonCompleted.aria"),
      };

    case "QUIZ_COMPLETED":
      return {
        title: tt("notifications.formatter.events.quizCompleted.title"),
        body: quizTitle
          ? score !== undefined
            ? tt(
                "notifications.formatter.events.quizCompleted.bodyWithQuizScore",
                {
                  quiz: quizTitle,
                  score,
                },
              )
            : tt("notifications.formatter.events.quizCompleted.bodyWithQuiz", {
                quiz: quizTitle,
              })
          : score !== undefined
            ? tt("notifications.formatter.events.quizCompleted.bodyWithScore", {
                score,
              })
            : tt("notifications.formatter.events.quizCompleted.body"),
        ariaLabel: tt("notifications.formatter.events.quizCompleted.aria", {
          quiz: quizTitle ? ` — ${quizTitle}` : "",
          score:
            score !== undefined
              ? `, ${tt("notifications.formatter.scorePrefix")} ${score}`
              : "",
        }),
      };

    case "ASSIGNMENT_SUBMITTED":
      return {
        title: tt("notifications.formatter.events.assignmentSubmitted.title"),
        body: assignmentTitle
          ? tt(
              "notifications.formatter.events.assignmentSubmitted.bodyWithAssignment",
              {
                assignment: assignmentTitle,
              },
            )
          : tt("notifications.formatter.events.assignmentSubmitted.body"),
        ariaLabel: assignmentTitle
          ? tt(
              "notifications.formatter.events.assignmentSubmitted.ariaWithAssignment",
              {
                assignment: assignmentTitle,
              },
            )
          : tt("notifications.formatter.events.assignmentSubmitted.aria"),
      };

    case "CLASS_JOINED":
      return {
        title: tt("notifications.formatter.events.classJoined.title"),
        body: courseName
          ? tt("notifications.formatter.events.classJoined.bodyWithCourse", {
              course: courseName,
            })
          : tt("notifications.formatter.events.classJoined.body"),
        ariaLabel: courseName
          ? tt("notifications.formatter.events.classJoined.ariaWithCourse", {
              course: courseName,
            })
          : tt("notifications.formatter.events.classJoined.aria"),
      };

    case "AI_TUTOR_INTERACTION":
      return {
        title: tt("notifications.formatter.events.aiTutor.title"),
        body: context ?? tt("notifications.formatter.events.aiTutor.body"),
        ariaLabel: tt("notifications.formatter.events.aiTutor.aria"),
      };

    case "INVITATION_ACCEPTED":
      return {
        title: tt("notifications.formatter.events.invitationAccepted.title"),
        body: actorName
          ? tt(
              "notifications.formatter.events.invitationAccepted.bodyWithActor",
              { actor: actorName },
            )
          : tt("notifications.formatter.events.invitationAccepted.body"),
        ariaLabel: actorName
          ? tt(
              "notifications.formatter.events.invitationAccepted.ariaWithActor",
              { actor: actorName },
            )
          : tt("notifications.formatter.events.invitationAccepted.aria"),
      };

    case "MODERATION_REPORT":
      return {
        title: tt("notifications.formatter.events.moderationReport.title"),
        body:
          context ?? tt("notifications.formatter.events.moderationReport.body"),
        ariaLabel: tt("notifications.formatter.events.moderationReport.aria"),
      };

    case "SYNC_FAILURE":
      return {
        title: tt("notifications.formatter.events.syncFailure.title"),
        body: context ?? tt("notifications.formatter.events.syncFailure.body"),
        ariaLabel: tt("notifications.formatter.events.syncFailure.aria"),
      };

    case "SYSTEM_ALERT":
      return {
        title: tt("notifications.formatter.events.systemAlert.title"),
        body: context ?? tt("notifications.formatter.events.systemAlert.body"),
        ariaLabel: tt("notifications.formatter.events.systemAlert.aria"),
      };

    case "USER_JOINED":
      return {
        title: tt("notifications.formatter.events.userJoined.title"),
        body: actorName
          ? tt("notifications.formatter.events.userJoined.bodyWithActor", {
              actor: actorName,
            })
          : tt("notifications.formatter.events.userJoined.body"),
        ariaLabel: actorName
          ? tt("notifications.formatter.events.userJoined.ariaWithActor", {
              actor: actorName,
            })
          : tt("notifications.formatter.events.userJoined.aria"),
      };

    default:
      return {
        title: tt("notifications.formatter.defaults.title"),
        body: context ?? tt("notifications.formatter.defaults.body"),
        ariaLabel: tt("notifications.formatter.defaults.aria"),
      };
  }
}

/**
 * Format a stored Notification record type into a human-readable message.
 * Used in NotificationCenter / NotificationPanel for display.
 */
export function formatNotificationMessage(
  type: NotificationType,
  title: string,
  message: string,
  meta: NotificationMeta = {},
): FormattedNotification {
  if (title && message) {
    return {
      title,
      body: message,
      ariaLabel: `${title}: ${message}`,
    };
  }

  const {
    actorName,
    courseName,
    assignmentTitle,
    quizTitle,
    score,
    badgeName,
    threadTitle,
  } = meta;

  switch (type) {
    case "grade_posted":
    case "grade":
      return {
        title: title || tt("notifications.formatter.messages.grade.title"),
        body:
          message ||
          (score !== undefined
            ? tt("notifications.formatter.messages.grade.bodyWithScore", {
                course: courseName
                  ? ` ${tt("notifications.formatter.forCourse")} ${courseName}`
                  : "",
                score,
              })
            : tt("notifications.formatter.messages.grade.body", {
                course: courseName
                  ? ` ${tt("notifications.formatter.forCourse")} ${courseName}`
                  : "",
              })),
        ariaLabel: tt("notifications.formatter.messages.grade.aria", {
          course: courseName ? ` — ${courseName}` : "",
        }),
      };

    case "assignment_due":
      return {
        title:
          title || tt("notifications.formatter.messages.assignmentDue.title"),
        body:
          message ||
          (assignmentTitle
            ? tt(
                "notifications.formatter.messages.assignmentDue.bodyWithAssignment",
                {
                  assignment: assignmentTitle,
                },
              )
            : tt("notifications.formatter.messages.assignmentDue.body")),
        ariaLabel: tt("notifications.formatter.messages.assignmentDue.aria", {
          assignment: assignmentTitle ? ` — ${assignmentTitle}` : "",
        }),
      };

    case "quiz_available":
      return {
        title:
          title || tt("notifications.formatter.messages.quizAvailable.title"),
        body:
          message ||
          (quizTitle
            ? tt(
                "notifications.formatter.messages.quizAvailable.bodyWithQuiz",
                { quiz: quizTitle },
              )
            : tt("notifications.formatter.messages.quizAvailable.body")),
        ariaLabel: tt("notifications.formatter.messages.quizAvailable.aria", {
          quiz: quizTitle ? ` — ${quizTitle}` : "",
        }),
      };

    case "quiz_result":
      return {
        title: title || tt("notifications.formatter.messages.quizResult.title"),
        body:
          message ||
          (score !== undefined
            ? tt("notifications.formatter.messages.quizResult.bodyWithScore", {
                quiz: quizTitle ? ` "${quizTitle}"` : "",
                score,
              })
            : tt("notifications.formatter.messages.quizResult.body", {
                quiz: quizTitle ? ` "${quizTitle}"` : "",
              })),
        ariaLabel: tt("notifications.formatter.messages.quizResult.aria", {
          quiz: quizTitle ? ` — ${quizTitle}` : "",
        }),
      };

    case "announcement":
      return {
        title:
          title || tt("notifications.formatter.messages.announcement.title"),
        body:
          message || tt("notifications.formatter.messages.announcement.body"),
        ariaLabel: tt("notifications.formatter.messages.announcement.aria", {
          title: title || tt("notifications.formatter.newLabel"),
        }),
      };

    case "course_enrolled":
      return {
        title:
          title || tt("notifications.formatter.messages.courseEnrolled.title"),
        body:
          message ||
          (courseName
            ? tt(
                "notifications.formatter.messages.courseEnrolled.bodyWithCourse",
                { course: courseName },
              )
            : tt("notifications.formatter.messages.courseEnrolled.body")),
        ariaLabel: tt("notifications.formatter.messages.courseEnrolled.aria", {
          course: courseName ? ` — ${courseName}` : "",
        }),
      };

    case "badge_earned":
      return {
        title:
          title || tt("notifications.formatter.messages.badgeEarned.title"),
        body:
          message ||
          (badgeName
            ? tt("notifications.formatter.messages.badgeEarned.bodyWithBadge", {
                badge: badgeName,
              })
            : tt("notifications.formatter.messages.badgeEarned.body")),
        ariaLabel: tt("notifications.formatter.messages.badgeEarned.aria", {
          badge: badgeName ? ` — ${badgeName}` : "",
        }),
      };

    case "discussion_reply":
      return {
        title:
          title || tt("notifications.formatter.messages.discussionReply.title"),
        body:
          message ||
          (actorName
            ? tt(
                "notifications.formatter.messages.discussionReply.bodyWithActor",
                {
                  actor: actorName,
                  thread: threadTitle ? ` "${threadTitle}"` : "",
                },
              )
            : tt("notifications.formatter.messages.discussionReply.body", {
                thread: threadTitle ? ` "${threadTitle}"` : "",
              })),
        ariaLabel: tt("notifications.formatter.messages.discussionReply.aria", {
          thread: threadTitle ? ` — ${threadTitle}` : "",
        }),
      };

    case "message_received":
      return {
        title:
          title || tt("notifications.formatter.messages.messageReceived.title"),
        body:
          message ||
          (actorName
            ? tt(
                "notifications.formatter.messages.messageReceived.bodyWithActor",
                { actor: actorName },
              )
            : tt("notifications.formatter.messages.messageReceived.body")),
        ariaLabel: tt("notifications.formatter.messages.messageReceived.aria", {
          actor: actorName
            ? ` ${tt("notifications.formatter.fromActor")} ${actorName}`
            : "",
        }),
      };

    case "system":
    case "system_alert":
      return {
        title: title || tt("notifications.formatter.messages.system.title"),
        body: message || tt("notifications.formatter.messages.system.body"),
        ariaLabel: tt("notifications.formatter.messages.system.aria", {
          title: title || tt("notifications.formatter.newInfo"),
        }),
      };

    case "invitation_accepted":
      return {
        title:
          title ||
          tt("notifications.formatter.messages.invitationAccepted.title"),
        body:
          message ||
          (actorName
            ? tt(
                "notifications.formatter.messages.invitationAccepted.bodyWithActor",
                { actor: actorName },
              )
            : tt("notifications.formatter.messages.invitationAccepted.body")),
        ariaLabel: actorName
          ? tt(
              "notifications.formatter.messages.invitationAccepted.ariaWithActor",
              { actor: actorName },
            )
          : tt("notifications.formatter.messages.invitationAccepted.aria"),
      };

    case "moderation_report":
      return {
        title:
          title ||
          tt("notifications.formatter.messages.moderationReport.title"),
        body:
          message ||
          tt("notifications.formatter.messages.moderationReport.body"),
        ariaLabel: tt("notifications.formatter.messages.moderationReport.aria"),
      };

    case "sync_failure":
      return {
        title:
          title || tt("notifications.formatter.messages.syncFailure.title"),
        body:
          message || tt("notifications.formatter.messages.syncFailure.body"),
        ariaLabel: tt("notifications.formatter.messages.syncFailure.aria"),
      };

    case "user_joined":
      return {
        title: title || tt("notifications.formatter.messages.userJoined.title"),
        body:
          message ||
          (actorName
            ? tt("notifications.formatter.messages.userJoined.bodyWithActor", {
                actor: actorName,
              })
            : tt("notifications.formatter.messages.userJoined.body")),
        ariaLabel: actorName
          ? tt("notifications.formatter.messages.userJoined.ariaWithActor", {
              actor: actorName,
            })
          : tt("notifications.formatter.messages.userJoined.aria"),
      };

    default:
      return {
        title: title || tt("notifications.formatter.defaults.title"),
        body: message || tt("notifications.formatter.defaults.body"),
        ariaLabel: title || tt("notifications.formatter.defaults.ariaShort"),
      };
  }
}

// ─── Date group helpers ───────────────────────────────────────────────────────

export type DateGroup = "Hari Ini" | "Kemarin" | "Minggu Lalu" | "Lebih Lama";

/**
 * Returns the date group label for a given ISO date string.
 */
export function getDateGroup(dateStr: string): DateGroup {
  const now = new Date();
  const date = new Date(dateStr);

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return "Hari Ini";
  }

  if (diffDays === 1) return "Kemarin";
  if (diffDays <= 7) return "Minggu Lalu";
  return "Lebih Lama";
}

/**
 * Relative time label in the active language.
 */
export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return tt("notifications.formatter.time.justNow");
  if (minutes < 60)
    return tt("notifications.formatter.time.minutesAgo", { count: minutes });
  if (hours < 24)
    return tt("notifications.formatter.time.hoursAgo", { count: hours });
  if (days === 1) return tt("notifications.formatter.time.yesterday");
  return tt("notifications.formatter.time.daysAgo", { count: days });
}
