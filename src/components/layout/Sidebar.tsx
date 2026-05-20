import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { ClassroomSwitcher } from "@/features/classroom/components/ClassroomSwitcher";
import { useArrowNavigation } from "@/hooks/useArrowNavigation";
import { ModuleId, useModuleConfig } from "@/hooks/useModuleConfig";
import { useSignOut } from "@/hooks/useSignOut";
import { navigationItems } from "@/shared/config/navigation";
import { cn } from "@/utils/cn";

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { activeRole } = useAuth();
  const handleSignOut = useSignOut();
  const { isModuleEnabled } = useModuleConfig();
  const { containerRef, handleKeyDown } = useArrowNavigation();

  const filteredNavItems = navigationItems.filter((item) => {
    // Only show sidebar items
    if (item.location !== "sidebar") return false;

    // Check role
    if (!activeRole) return false;
    if (!item.roles.includes(activeRole)) return false;

    // Check module config if applicable
    if (item.moduleId && !isModuleEnabled(item.moduleId as ModuleId))
      return false;

    return true;
  });

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          EduSync
        </span>
      </div>

      {/* Classroom switcher — hanya untuk teacher */}
      {activeRole === "teacher" && (
        <div className="mb-6 px-2">
          <ClassroomSwitcher variant="slate" />
        </div>
      )}

      <nav
        ref={containerRef as React.RefObject<HTMLElement>}
        aria-label={t("navigation.sidebar.menuLabel")}
        role="presentation"
        onKeyDown={handleKeyDown}
        className="flex-1 space-y-2 overflow-y-auto hide-scrollbar"
      >
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/30 dark:to-transparent text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800/50"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-500",
                )}
              />
              {t(item.name)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          data-testid="sidebar-signout-button"
          onClick={() => void handleSignOut()}
          className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 hover:text-red-600 font-semibold py-3 px-4 rounded-xl transition-all duration-200 text-sm group"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          {t("navigation.sidebar.signOut")}
        </button>
      </div>
    </aside>
  );
}
