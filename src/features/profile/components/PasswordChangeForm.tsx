import { CheckCircle, KeyRound, Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, Input } from "@/components/ui";
import { settingsService } from "@/features/settings/api/settingsService";
import { cn } from "@/utils/cn";

type Status = "idle" | "loading" | "success" | "error";

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  if (password.length < 12) return "weak";

  // A password that's long enough but missing uppercase or digits is still 'weak'
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return "weak";

  const checks = [
    /[a-z]/.test(password), // lowercase
    /[A-Z]/.test(password), // uppercase
    /[0-9]/.test(password), // number
    /[^a-zA-Z0-9]/.test(password), // special char
  ];
  const score = checks.filter(Boolean).length;

  if (score >= 3) return "strong";
  if (score >= 2) return "medium";
  return "weak";
}

export function PasswordChangeForm() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const validate = (): string | null => {
    if (newPassword.length < 12) return t("profile.account.passwordMinLength");
    if (!/[A-Z]/.test(newPassword))
      return t("profile.account.passwordNeedsUppercase");
    if (!/[0-9]/.test(newPassword))
      return t("profile.account.passwordNeedsNumber");
    if (newPassword !== confirmPassword)
      return t("profile.account.passwordConfirmMismatch");
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      await settingsService.changePassword(newPassword);
      setStatus("success");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : t("profile.account.passwordChangeError"),
      );
    }
  };

  const isLoading = status === "loading";
  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <Card
      padding="lg"
      className="rounded-3xl dark:bg-slate-800 dark:border-slate-700"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <KeyRound className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t("profile.account.changePasswordTitle")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("profile.account.changePasswordDescription")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("profile.account.newPasswordLabel")}
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (status === "error") setErrorMsg("");
          }}
          placeholder={t("profile.account.newPasswordPlaceholder")}
          disabled={isLoading}
          icon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
        />

        {newPassword && (
          <div className="mt-1">
            <div className="flex gap-1 mb-1">
              {(["weak", "medium", "strong"] as const).map((level, i) => {
                const strengthIndex = passwordStrength
                  ? ["weak", "medium", "strong"].indexOf(passwordStrength)
                  : -1;
                return (
                  <div
                    key={level}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-200",
                      i <= strengthIndex
                        ? passwordStrength === "weak"
                          ? "bg-red-500"
                          : passwordStrength === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        : "bg-slate-200 dark:bg-slate-700",
                    )}
                  />
                );
              })}
            </div>
            <p
              className={cn(
                "text-xs",
                passwordStrength === "weak" && "text-red-500",
                passwordStrength === "medium" &&
                  "text-yellow-600 dark:text-yellow-400",
                passwordStrength === "strong" &&
                  "text-green-600 dark:text-green-400",
              )}
            >
              {passwordStrength === "weak" &&
                t("profile.account.passwordStrengthWeak")}
              {passwordStrength === "medium" &&
                t("profile.account.passwordStrengthMedium")}
              {passwordStrength === "strong" &&
                t("profile.account.passwordStrengthStrong")}
            </p>
          </div>
        )}

        <Input
          label={t("profile.account.confirmPasswordLabel")}
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (status === "error") setErrorMsg("");
          }}
          placeholder={t("profile.account.confirmPasswordPlaceholder")}
          disabled={isLoading}
          icon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
          error={
            confirmPassword && newPassword && confirmPassword !== newPassword
              ? t("profile.account.passwordMismatchShort")
              : undefined
          }
        />

        {/* Feedback */}
        {status === "error" && errorMsg && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
            {errorMsg}
          </p>
        )}
        {status === "success" && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {t("profile.account.passwordChangedSuccess")}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={!newPassword || !confirmPassword || isLoading}
          >
            {t("profile.account.changePasswordButton")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
