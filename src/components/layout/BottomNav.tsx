import {
  Building2,
  Calendar as CalendarIcon,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutGrid,
  Megaphone,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/AuthContext";
import { useNavBadges } from "@/hooks/useNavBadges";
import { cn } from "@/utils/cn";

// Badge count yang ditampilkan per path
type BadgeKey = "assignments" | "announcements" | null;

const navItems: Array<{
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badgeKey?: BadgeKey;
}> = [
  // Teacher Primary
  {
    name: "navigation.bottomNav.dashboardTeacher",
    path: "/app/teacher/dashboard",
    icon: GraduationCap,
    roles: ["teacher"],
  },

  // Student Primary
  {
    name: "navigation.bottomNav.homeStudent",
    path: "/app/student/dashboard",
    icon: Home,
    roles: ["student"],
  },
  {
    name: "navigation.bottomNav.quizStudent",
    path: "/app/student/quizzes",
    icon: HelpCircle,
    roles: ["student"],
  },

  // Admin Primary
  {
    name: "navigation.bottomNav.dashboardAdmin",
    path: "/app/admin/dashboard",
    icon: Building2,
    roles: ["admin"],
  },

  // Shared Primary
  {
    name: "navigation.bottomNav.assignments",
    path: "/assignments",
    icon: FolderKanban,
    roles: ["teacher", "student"],
    badgeKey: "assignments",
  },
  {
    name: "navigation.bottomNav.calendar",
    path: "/calendar",
    icon: CalendarIcon,
    roles: ["teacher", "student", "admin"],
  },
  {
    name: "navigation.bottomNav.announcements",
    path: "/announcements",
    icon: Megaphone,
    roles: ["teacher", "student", "admin"],
    badgeKey: "announcements",
  },
  {
    name: "navigation.bottomNav.menu",
    path: "/directory",
    icon: LayoutGrid,
    roles: ["teacher", "student", "admin"],
  },
];

// ─── Badge dot component ─────────────────────────────────────────────────────

function BadgeDot({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;

  return (
    <span
      aria-label={t("navigation.bottomNav.unreadAria").replace(
        "__COUNT__",
        String(count),
      )}
      className={cn(
        "absolute top-0 right-1/4 -translate-y-0.5 translate-x-1/2",
        "inline-flex items-center justify-center",
        "min-w-[16px] h-4 px-1 rounded-full",
        "bg-red-500 text-white text-[9px] font-bold leading-none",
        "ring-1 ring-white dark:ring-slate-900",
        "pointer-events-none select-none",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { role } = useAuth();
  const { pendingAssignments, unreadNotifications } = useNavBadges();

  // Filter items based on role
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role));

  function getBadgeCount(badgeKey: BadgeKey): number {
    if (badgeKey === "assignments") return pendingAssignments;
    if (badgeKey === "announcements") return unreadNotifications;
    return 0;
  }

  return (
    <nav
      aria-label={t("navigation.bottomNav.navLabel")}
      className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-around px-2 z-[999] py-3 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
    >
      {filteredNavItems.map((item) => {
        const isActive =
          location.pathname === item.path ||
          location.pathname.startsWith(item.path + "/");

        const badgeCount = getBadgeCount(item.badgeKey ?? null);

        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center w-full min-h-[44px] gap-1 transition-colors relative group outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:rounded-xl",
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
            )}
          >
            {isActive && (
              <span className="absolute -bottom-3 w-12 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
            )}
            {/* Icon wrapper — relative so badge is positioned within */}
            <span className="relative inline-flex">
              <item.icon
                className={cn(
                  "w-6 h-6 transition-transform group-active:scale-95",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-500",
                )}
              />
              <BadgeDot count={badgeCount} />
            </span>
            <span className="text-[10px] font-medium truncate max-w-[64px]">
              {t(item.name)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
