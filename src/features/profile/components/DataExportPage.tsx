import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, Spinner } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

import type { UserDataExport } from "../api/privacyService";
import { downloadExport, exportUserData } from "../api/privacyService";

export function DataExportPage() {
  const { user, tenantId } = useAuth();
  const { addToast } = useToast();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [lastExport, setLastExport] = useState<UserDataExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!user || !tenantId) return;
    setLoading(true);
    setError(null);

    const data = await exportUserData(user.id, tenantId);
    if (data) {
      setLastExport(data);
      downloadExport(data);
      addToast({
        type: "success",
        message: t("profile.privacy.exportSuccessToast"),
      });
    } else {
      setError(t("profile.privacy.exportError"));
      addToast({
        type: "error",
        message: t("profile.privacy.exportErrorToast"),
      });
    }
    setLoading(false);
  }, [user, tenantId, addToast, t]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("profile.privacy.exportTitle")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {t("profile.privacy.exportDescription")}
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {t("profile.privacy.exportIncludesTitle")}
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li>• {t("profile.privacy.exportIncludesProfile")}</li>
            <li>• {t("profile.privacy.exportIncludesEnrollments")}</li>
            <li>• {t("profile.privacy.exportIncludesProgress")}</li>
            <li>• {t("profile.privacy.exportIncludesGrades")}</li>
            <li>• {t("profile.privacy.exportIncludesMessages")}</li>
            <li>• {t("profile.privacy.exportIncludesCertificates")}</li>
          </ul>
        </div>

        {error && (
          <p
            className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button onClick={handleExport} disabled={loading} fullWidth>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" />
              {t("profile.privacy.exporting")}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              {t("profile.privacy.downloadMyData")}
            </span>
          )}
        </Button>
      </Card>

      {lastExport && (
        <Card className="p-4">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">
            {t("profile.privacy.lastExport")}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {new Date(lastExport.exportedAt).toLocaleString(
              i18n.language === "en" ? "en-US" : "id-ID",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500">
                {t("profile.privacy.enrollments")}:
              </span>{" "}
              <span className="font-medium">
                {lastExport.enrollments.length}
              </span>
            </div>
            <div>
              <span className="text-slate-500">
                {t("profile.privacy.progress")}:
              </span>{" "}
              <span className="font-medium">{lastExport.progress.length}</span>
            </div>
            <div>
              <span className="text-slate-500">
                {t("profile.privacy.grades")}:
              </span>{" "}
              <span className="font-medium">{lastExport.grades.length}</span>
            </div>
            <div>
              <span className="text-slate-500">
                {t("profile.privacy.certificates")}:
              </span>{" "}
              <span className="font-medium">
                {lastExport.certificates.length}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
