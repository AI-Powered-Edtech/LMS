import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

import { requestAccountDeletion } from "../api/privacyService";

export function AccountDeletionPage() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!user || !reason.trim() || confirmName !== (profile?.first_name ?? ""))
      return;
    setLoading(true);
    setError(null);

    const success = await requestAccountDeletion(user.id, reason.trim());
    if (success) {
      setSubmitted(true);
      addToast({
        type: "success",
        message: t("profile.privacy.deleteSuccessToast"),
      });
    } else {
      setError(t("profile.privacy.deleteError"));
      addToast({
        type: "error",
        message: t("profile.privacy.deleteErrorToast"),
      });
    }
    setLoading(false);
  }, [user, reason, confirmName, profile, addToast, t]);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <Card className="p-6 text-center space-y-4">
          <div className="text-4xl">📨</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("profile.privacy.deleteSubmittedTitle")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t("profile.privacy.deleteSubmittedDescription")}
          </p>
          <a href="/app/student/dashboard">
            <Button>{t("profile.privacy.backToDashboard")}</Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("profile.privacy.deleteTitle")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {t("profile.privacy.deleteDescription")}
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ⚠️ <strong>{t("profile.privacy.warningTitle")}</strong>{" "}
            {t("profile.privacy.warningDescription")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("profile.privacy.deleteReasonLabel")}
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("profile.privacy.deleteReasonPlaceholder")}
            aria-label={t("profile.privacy.deleteReasonAria")}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("profile.privacy.deleteConfirmLabel")}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={
              profile?.first_name ?? t("profile.privacy.firstNamePlaceholder")
            }
            aria-label={t("profile.privacy.deleteConfirmAria")}
          />
        </div>

        {error && (
          <p
            className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={
            loading ||
            !reason.trim() ||
            confirmName !== (profile?.first_name ?? "")
          }
          variant="danger"
          fullWidth
        >
          {loading
            ? t("auth.pages.sending")
            : t("profile.privacy.sendDeleteRequest")}
        </Button>
      </Card>
    </div>
  );
}
