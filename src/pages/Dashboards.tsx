import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DashboardConfig } from "@/features/dashboards";
import {
  DashboardBuilder,
  DashboardList,
  DashboardViewer,
} from "@/features/dashboards";
import { usePageTitle } from "@/hooks/usePageTitle";

type View = "list" | "create" | "edit" | "view";

export function Dashboards() {
  const { t } = useTranslation();
  usePageTitle(t("dashboards.pageTitle"));
  const [view, setView] = useState<View>("list");
  const [selectedDashboard, setSelectedDashboard] =
    useState<DashboardConfig | null>(null);

  // ⚡ Perf: stabilize handler refs passed as props to DashboardList/DashboardBuilder
  const handleCreate = useCallback(() => {
    setSelectedDashboard(null);
    setView("create");
  }, []);

  const handleEdit = useCallback((dashboard: DashboardConfig) => {
    setSelectedDashboard(dashboard);
    setView("edit");
  }, []);

  const handleView = useCallback((dashboard: DashboardConfig) => {
    setSelectedDashboard(dashboard);
    setView("view");
  }, []);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedDashboard(null);
  }, []);

  const handleSaved = useCallback(() => setView("list"), []);

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {view !== "list" && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <LayoutDashboard className="h-7 w-7 text-indigo-500" />
              {view === "list" && t("dashboards.customTitle")}
              {view === "create" && t("dashboards.createTitle")}
              {view === "edit" &&
                t("dashboards.editTitle").replace(
                  "{name}",
                  selectedDashboard?.name ?? "",
                )}
              {view === "view" && selectedDashboard?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {view === "list" && t("dashboards.customDescription")}
              {view === "create" && t("dashboards.createDescription")}
              {view === "edit" && t("dashboards.editDescription")}
              {view === "view" && (selectedDashboard?.description ?? "")}
            </p>
          </div>
        </div>

        {/* Content */}
        {view === "list" && (
          <DashboardList
            onCreate={handleCreate}
            onEdit={handleEdit}
            onView={handleView}
          />
        )}

        {(view === "create" || view === "edit") && (
          <DashboardBuilder
            initialDashboard={view === "edit" ? selectedDashboard : null}
            onSaved={handleSaved}
          />
        )}

        {view === "view" && selectedDashboard && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => handleEdit(selectedDashboard)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                {t("dashboards.editButton")}
              </button>
            </div>
            <DashboardViewer dashboard={selectedDashboard} />
          </div>
        )}
      </div>
    </div>
  );
}
