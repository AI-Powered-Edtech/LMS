import {
  Award,
  Bell,
  BookOpen,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Inbox,
  MessageSquare,
  Settings,
  Zap,
} from "lucide-react";
import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState, SkeletonCard } from "@/components/ui";
import { cn } from "@/utils/cn";

import { useNotifications } from "../hooks/useNotifications";
import type { Notification, NotificationType } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeIcon(type: NotificationType) {
  const cls = "w-4 h-4 flex-shrink-0";
  switch (type) {
    case "badge_earned":
      return <Award className={cn(cls, "text-yellow-500")} />;
    case "announcement":
      return <Bell className={cn(cls, "text-blue-500")} />;
    case "grade_posted":
    case "grade":
      return <CheckCircle className={cn(cls, "text-green-500")} />;
    case "quiz_available":
      return <ClipboardList className={cn(cls, "text-purple-500")} />;
    case "assignment_due":
      return <BookOpen className={cn(cls, "text-orange-500")} />;
    case "course_enrolled":
      return <GraduationCap className={cn(cls, "text-indigo-500")} />;
    case "discussion_reply":
      return <MessageSquare className={cn(cls, "text-teal-500")} />;
    case "system":
      return <Zap className={cn(cls, "text-slate-500")} />;
    default:
      return <Bell className={cn(cls, "text-slate-400")} />;
  }
}

function relativeTime(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("notificationsPanel.time.justNow");
  if (minutes < 60)
    return t("notificationsPanel.time.minutesAgo").replace(
      "__COUNT__",
      String(minutes),
    );
  if (hours < 24)
    return t("notificationsPanel.time.hoursAgo").replace(
      "__COUNT__",
      String(hours),
    );
  if (days === 1) return t("notificationsPanel.time.yesterday");
  return t("notificationsPanel.time.daysAgo").replace(
    "__COUNT__",
    String(days),
  );
}

function resolveUrl(notification: Notification): string | null {
  if (notification.link) return notification.link;
  switch (notification.type) {
    case "grade_posted":
    case "grade":
      return "/app/student/grades";
    case "assignment_due":
      return "/assignments";
    case "quiz_available":
      return "/app/student/quizzes";
    case "announcement":
      return "/announcements";
    case "course_enrolled":
      return "/app/student/courses";
    case "badge_earned":
      return "/app/student/gamification";
    case "discussion_reply":
      return "/forum";
    default:
      return null;
  }
}

// ─── Notification Item ────────────────────────────────────────────────────────

// ⚡ Perf: Changed interface from `onRead: () => void` to `markRead: (id) => void`.
// Previously the parent passed `onRead={() => markRead(n.id)}` — a new arrow function
// per notification per render — which defeated the React.memo on NotificationItem.
// Now the stable `markRead` reference is passed once, and the child calls it with
// its own notification ID internally.
interface NotificationItemProps {
  notification: Notification;
  markRead: (id: string) => void;
  onClose: () => void;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  markRead,
  onClose,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const url = resolveUrl(notification);
  const bodyText = notification.message;

  const handleClick = useCallback(() => {
    if (!notification.is_read) markRead(notification.id);
    if (url) {
      onClose();
      void navigate(url);
    }
  }, [notification.is_read, notification.id, markRead, url, onClose, navigate]);

  const readStatus = notification.is_read
    ? t("notificationsPanel.status.read")
    : t("notificationsPanel.status.unread");
  const ariaLabel = `${notification.title}, ${readStatus}${url ? `, ${t("notificationsPanel.status.clickToOpen")}` : ""}`;

  return (
    <div
      role="listitem"
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        !notification.is_read && "bg-blue-50/40 dark:bg-blue-900/10",
      )}
    >
      {/* Unread dot */}
      <div className="mt-1 flex-shrink-0 w-2" aria-hidden="true">
        {!notification.is_read && (
          <span className="block w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Icon */}
      <div className="mt-0.5" aria-hidden="true">
        {getTypeIcon(notification.type)}
      </div>

      {/* Content — wrapped in a button so it's a single focusable interactive element */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        className={cn(
          "flex-1 min-w-0 text-left cursor-pointer",
          "hover:bg-transparent focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded",
        )}
      >
        <p
          className={cn(
            "text-sm leading-snug truncate",
            notification.is_read
              ? "text-slate-600 dark:text-slate-400"
              : "font-semibold text-slate-900 dark:text-slate-100",
          )}
        >
          {notification.title}
        </p>
        {bodyText && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {bodyText}
          </p>
        )}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {relativeTime(notification.created_at, t)}
        </p>
      </button>
    </div>
  );
});

// ─── Panel ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  onClose: () => void;
}

export const NotificationPanel = memo(function NotificationPanel({
  onClose,
}: NotificationPanelProps) {
  const { t } = useTranslation();
  const { notifications, unreadCount, isLoading, markRead, markAllRead } =
    useNotifications();

  const recent = notifications.slice(0, 10);

  return (
    // ACCESSIBILITY: aria-live="polite" announces new notifications to screen readers.
    // aria-label gives the region a meaningful name for assistive technology.
    <div
      aria-label={t("notificationsPanel.aria.panel")}
      aria-live="polite"
      aria-atomic="false"
      className="w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div>
          <h3
            className="font-bold text-slate-900 dark:text-slate-100 text-sm"
            id="notification-panel-title"
          >
            {t("notificationsPanel.title")}
          </h3>
          {/* aria-live="off" prevents double-announcing — outer div already handles it */}
          <p
            className="text-[10px] text-slate-500 dark:text-slate-400"
            aria-live="off"
          >
            {unreadCount > 0
              ? t("notificationsPanel.unreadCount").replace(
                  "__COUNT__",
                  String(unreadCount),
                )
              : t("notificationsPanel.allRead")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              aria-label={t(
                "notificationsPanel.actions.markAllReadAria",
              ).replace("__COUNT__", String(unreadCount))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              {t("notificationsPanel.actions.markAllRead")}
            </button>
          )}
          <Link
            to="/settings"
            onClick={onClose}
            aria-label={t("notificationsPanel.actions.settingsAria")}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Body — role="list" pairs with role="listitem" on each NotificationItem */}
      <div
        role="list"
        aria-labelledby="notification-panel-title"
        className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800"
      >
        {isLoading && recent.length === 0 ? (
          // UX FIX: Use Skeleton instead of raw spinner for layout-consistent loading
          <div
            className="space-y-2 p-3"
            aria-label={t("notificationsPanel.loading")}
          >
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-8 h-8" />}
            title={t("notificationsPanel.empty.title")}
            description={t("notificationsPanel.empty.description")}
          />
        ) : (
          recent.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              markRead={markRead}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {recent.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
          <Link
            to="/notifications"
            onClick={onClose}
            className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            {t("notificationsPanel.actions.viewAll")}
          </Link>
        </div>
      )}
    </div>
  );
});
