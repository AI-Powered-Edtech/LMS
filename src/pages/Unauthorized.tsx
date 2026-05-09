import { ArrowLeft, Home, ShieldX } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";

const DASHBOARD_PATHS: Record<string, string> = {
  teacher: "/app/teacher/dashboard",
  student: "/app/student/dashboard",
  admin: "/app/admin/dashboard",
};

export function Unauthorized() {
  const { t } = useTranslation();
  usePageTitle(t("auth.pages.unauthorizedPageTitle"));
  const navigate = useNavigate();
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // State injected by RoleGuard — contains the user's actual role and attempted path
  const state = location.state as { from?: Location; userRole?: string } | null;
  const dashboardPath = DASHBOARD_PATHS[state?.userRole ?? ""] ?? "/app";

  // WCAG 2.4.3: Move focus to the main content area after redirect
  // Without this, keyboard focus stays on whatever was focused before the redirect
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 mb-6">
            <ShieldX size={40} />
          </div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-4xl font-bold text-slate-900 dark:text-white mb-4 outline-none"
          >
            {t("auth.pages.unauthorizedHeading")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            {t("auth.pages.unauthorizedDescription")}
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <ArrowLeft size={20} />
            <span>{t("common.back")}</span>
          </button>

          <button
            onClick={() => navigate(dashboardPath, { replace: true })}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Home size={20} />
            <span>{t("auth.pages.goToMyDashboard")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
