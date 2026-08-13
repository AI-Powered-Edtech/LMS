import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import {
  Award,
  BookOpen,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Inbox,
  MessageSquare,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/AuthContext";
import type { Notification, NotificationType } from "@/features/notifications";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  NotificationPreferencesPanel,
} from "@/features/notifications";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FilterTab = "semua" | "belum-dibaca" | NotificationType;

const PAGE_SIZE = 20;

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
    default:
      return <Zap className={cn(cls, "text-slate-500")} />;
  }
}

function relativeTime(dateStr: string, t: TFunction): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("notificationsPage.time.justNow");
  if (minutes < 60)
    return t("notificationsPage.time.minutesAgo").replace(
      "__COUNT__",
      String(minutes),
    );
  if (hours < 24)
    return t("notificationsPage.time.hoursAgo").replace(
      "__COUNT__",
      String(hours),
    );
  if (days === 1) return t("notificationsPage.time.yesterday");
  return t("notificationsPage.time.daysAgo").replace("__COUNT__", String(days));
}

const TAB_LABEL_KEYS: Record<FilterTab, string> = {
  semua: "notificationsPage.tabs.all",
  "belum-dibaca": "notificationsPage.tabs.unread",
  grade_posted: "notificationsPage.tabs.grade",
  grade: "notificationsPage.tabs.grade",
  assignment_due: "notificationsPage.tabs.assignment",
  quiz_available: "notificationsPage.tabs.quiz",
  quiz_result: "notificationsPage.tabs.quizResult",
  announcement: "notificationsPage.tabs.announcement",
  course_enrolled: "notificationsPage.tabs.course",
  badge_earned: "notificationsPage.tabs.badge",
  discussion_reply: "notificationsPage.tabs.discussion",
  message_received: "notificationsPage.tabs.message",
  system: "notificationsPage.tabs.system",
  // Admin types
  system_alert: "notificationsPage.tabs.systemAlert",
  invitation_accepted: "notificationsPage.tabs.invitation",
  moderation_report: "notificationsPage.tabs.moderation",
  sync_failure: "notificationsPage.tabs.sync",
  user_joined: "notificationsPage.tabs.newUser",
};

const FILTER_TABS: FilterTab[] = [
  "semua",
  "belum-dibaca",
  "announcement",
  "grade_posted",
  "assignment_due",
  "quiz_available",
  "badge_earned",
  "discussion_reply",
  "system",
];

// ─── Notification Row ─────────────────────────────────────────────────────────

interface RowProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

function NotificationRow({ notification, onMarkRead }: RowProps) {
  const { t } = useTranslation();
  const bodyText = notification.message;

  return (
    <div
      className={cn(
        "flex items-start gap-4 px-6 py-4 transition-colors",
        !notification.is_read
          ? "bg-blue-50/50 dark:bg-blue-900/10"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
      )}
    >
      {/* Unread indicator */}
      <div className="mt-1 w-2 flex-shrink-0">
        {!notification.is_read && (
          <span className="block w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Icon */}
      <div className="mt-0.5">{getTypeIcon(notification.type)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
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
      </div>

      {/* Action */}
      {!notification.is_read && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {t("notificationsPage.actions.markRead")}
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Notifications() {
  const { t } = useTranslation();
  usePageTitle(t("notificationsPage.pageTitle"));
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FilterTab>("semua");
  const [page, setPage] = useState(0);
  const [showPrefs, setShowPrefs] = useState(false);

  const offset = page * PAGE_SIZE;

  const { data: allNotifications = [], isLoading } = useQuery({
    queryKey: notificationKeys.list(tenantId!, user!.id, offset),
    queryFn: () => fetchNotifications(user!.id, tenantId!, PAGE_SIZE, offset),
    enabled: !!tenantId && !!user,
  });

  const markReadMutation = useMutation({
    // FIXED: Pass userId + tenantId for row-level ownership check on UPDATE
    mutationFn: (id: string) => markNotificationRead(id, user!.id, tenantId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all(tenantId!),
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id, tenantId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all(tenantId!),
      });
    },
  });

  // Apply filter
  // ⚡ Perf: Memoize filtered notifications and unread count to prevent O(N) operations on every render
  const filtered = useMemo(() => {
    return allNotifications.filter((n) => {
      if (activeTab === "semua") return true;
      if (activeTab === "belum-dibaca") return !n.is_read;
      return n.type === activeTab;
    });
  }, [allNotifications, activeTab]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !n.is_read).length;
  }, [allNotifications]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("notificationsPage.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {unreadCount > 0
              ? t("notificationsPage.unreadCount").replace(
                  "__COUNT__",
                  String(unreadCount),
                )
              : t("notificationsPage.allRead")}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50"
          >
            {markAllMutation.isPending
              ? t("notificationsPage.actions.processing")
              : t("notificationsPage.actions.markAllRead")}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-1 scrollbar-none"
        role="tablist"
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(0);
            }}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
            )}
          >
            {t(TAB_LABEL_KEYS[tab])}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Inbox className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              {t("notificationsPage.empty.title")}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              {t("notificationsPage.empty.description")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && allNotifications.length === PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            >
              {t("notificationsPage.pagination.previous")}
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {t("notificationsPage.pagination.page").replace(
                "{page}",
                String(page + 1),
              )}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
            >
              {t("notificationsPage.pagination.next")}
            </button>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPrefs((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t("notificationsPage.preferencesTitle")}
          </span>
          {showPrefs ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showPrefs && (
          <div className="border-t border-slate-100 dark:border-slate-800">
            <NotificationPreferencesPanel />
          </div>
        )}
      </div>
    </div>
  );
}
