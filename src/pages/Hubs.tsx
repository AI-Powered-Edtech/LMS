import { useTranslation } from "react-i18next";

import { HubView } from "@/components/HubView";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentXPProfile } from "@/features/gamification/queries/gamificationQueries";
import { ModuleId, useModuleConfig } from "@/hooks/useModuleConfig";
import { usePageTitle } from "@/hooks/usePageTitle";
import { navigationItems } from "@/shared/config/navigation";

/**
 * Pakai `activeRole` (per-tenant role yang dipakai RoleGuard & Sidebar),
 * bukan `role` (global primary role). `role` bisa balik ke 'student' saat
 * array roles kosong karena `getPrimaryRole` default ke 'student' -> hub
 * jadi kosong untuk guru. activeRole selalu mengikuti membership aktif.
 */
function useHubItems(
  location: "teaching-hub" | "social-hub" | "gamification-hub" | "admin-hub",
) {
  const { activeRole } = useAuth();
  const { isModuleEnabled } = useModuleConfig();

  return navigationItems.filter((item) => {
    if (item.location !== location) return false;
    if (!activeRole) return false;
    if (!item.roles.includes(activeRole)) return false;
    if (item.moduleId && !isModuleEnabled(item.moduleId as ModuleId))
      return false;
    return true;
  });
}

export function TeachingHub() {
  const { t } = useTranslation();
  usePageTitle(t("hubs.teaching.pageTitle"));
  const items = useHubItems("teaching-hub");

  return (
    <HubView
      title={t("hubs.teaching.title")}
      description={t("hubs.teaching.description")}
      items={items}
      emptyTitle={t("hubs.teaching.emptyTitle")}
      emptyDescription={t("hubs.teaching.emptyDescription")}
    />
  );
}

export function SocialHub() {
  const { t } = useTranslation();
  usePageTitle(t("hubs.social.pageTitle"));
  const items = useHubItems("social-hub");

  return (
    <HubView
      title={t("hubs.social.title")}
      description={t("hubs.social.description")}
      items={items}
      emptyTitle={t("hubs.social.emptyTitle")}
      emptyDescription={t("hubs.social.emptyDescription")}
    />
  );
}

export function GamificationHub() {
  const { t } = useTranslation();
  usePageTitle(t("hubs.gamification.pageTitle"));
  const { activeRole } = useAuth();
  const items = useHubItems("gamification-hub");

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4 md:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t("hubs.gamification.heading")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          {t("hubs.gamification.subheading")}
        </p>
      </div>

      {/* XP Summary Card - only for students */}
      {activeRole === "student" && <GamificationSummary />}

      {/* Navigation items */}
      <HubView
        title=""
        description=""
        items={items}
        emptyTitle={t("hubs.gamification.emptyTitle")}
        emptyDescription={
          activeRole === "teacher"
            ? t("hubs.gamification.emptyDescription.teacher")
            : t("hubs.gamification.emptyDescription.student")
        }
      />
    </div>
  );
}

// Gamification summary using top-level ESM import
function GamificationSummary() {
  const { t } = useTranslation();
  const { data: xpProfile } = useStudentXPProfile();

  if (!xpProfile) return null;

  const level = xpProfile.level ?? 1;
  const totalXp = xpProfile.total_xp ?? 0;
  const streak = xpProfile.streak_current ?? 0;
  const xpNext = xpProfile.xp_next_level ?? 100;
  const xpCurrent = xpProfile.xp_current_level ?? 0;
  const progress =
    xpNext > xpCurrent
      ? Math.min(((totalXp - xpCurrent) / (xpNext - xpCurrent)) * 100, 100)
      : 100;

  const levelTitle = (lvl: number) =>
    t(`hubs.gamification.summary.levelTitles.${lvl}`, {
      defaultValue: t("hubs.gamification.summary.levelTitles.1"),
    });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* XP & Level Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-blue-200 text-sm font-medium">
            {t("hubs.gamification.summary.levelLabel").replace(
              "__LEVEL__",
              String(level),
            )}
          </span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
            {levelTitle(level)}
          </span>
        </div>
        <p className="text-3xl font-extrabold">
          {totalXp.toLocaleString("id-ID")} XP
        </p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-blue-200 mb-1">
            <span>
              {t("hubs.gamification.summary.progressTo").replace(
                "__LEVEL__",
                String(Math.min(level + 1, 10)),
              )}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔥</span>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {t("hubs.gamification.summary.streakLabel")}
          </span>
        </div>
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {streak}{" "}
          <span className="text-lg font-bold text-slate-400">
            {t("hubs.gamification.summary.streakDays")}
          </span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {t("hubs.gamification.summary.streakRecord").replace(
            "__N__",
            String(xpProfile.streak_longest ?? 0),
          )}
        </p>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚡</span>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {t("hubs.gamification.summary.recentLabel")}
          </span>
        </div>
        {xpProfile.recent_xp && xpProfile.recent_xp.length > 0 ? (
          <div className="space-y-2">
            {xpProfile.recent_xp
              .slice(0, 3)
              .map(
                (
                  tx: {
                    xp_amount: number;
                    source_type: string;
                    created_at: string;
                  },
                  i: number,
                ) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {t(
                        `hubs.gamification.summary.sources.${tx.source_type}`,
                        { defaultValue: tx.source_type },
                      )}
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-bold shrink-0">
                      +{tx.xp_amount} XP
                    </span>
                  </div>
                ),
              )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            {t("hubs.gamification.summary.empty")}
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminHub() {
  const { t } = useTranslation();
  usePageTitle(t("hubs.admin.pageTitle"));
  const items = useHubItems("admin-hub");

  return (
    <HubView
      title={t("hubs.admin.title")}
      description={t("hubs.admin.description")}
      items={items}
      emptyTitle={t("hubs.admin.emptyTitle")}
      emptyDescription={t("hubs.admin.emptyDescription")}
    />
  );
}
