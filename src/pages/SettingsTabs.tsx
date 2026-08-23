/**
 * Settings page tab content components.
 * Extracted to keep Settings.tsx under the max-lines limit.
 */
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  Camera,
  Eye,
  EyeOff,
  Lock,
  Monitor,
  Moon,
  Save,
  Sun,
} from "lucide-react";
import { useCallback, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { OptimizedImage } from "@/components/ui";
import { OfflineFormNotice } from "@/components/ui/OfflineFormNotice";
import type { Theme } from "@/contexts/ThemeContext";
import { MFASettings } from "@/features/auth/components/MFASettings";
import { publicProfileService } from "@/features/profile/api/publicProfileService";
import { db } from "@/services/db";
import {
  type ProfileFormData,
  ProfileFormSchema,
} from "@/shared/schemas/forms";
import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";
import { captureError } from "@/utils/sentry";

// ── Toggle Row ────────────────────────────────────────────────────────────────
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────────────────────────
interface AccountTabProps {
  userId: string;
  avatarUrl: string | null | undefined;
  displayEmail: string;
  roleLabel: string;
  displayName: string;
}

export function AccountTab({
  userId,
  avatarUrl,
  displayEmail,
  roleLabel,
  displayName,
}: AccountTabProps) {
  const { t } = useTranslation();
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: valibotResolver(
      ProfileFormSchema,
    ) as unknown as Resolver<ProfileFormData>,
    defaultValues: { fullName: displayName },
  });

  const onSaveProfile = async (data: ProfileFormData) => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      await publicProfileService.updateProfileName(userId, data.fullName);
      setProfileMessage({
        type: "success",
        text: t("settings.account.profileUpdated"),
      });
    } catch (err) {
      captureError(err, { context: "SettingsTabs.updateProfile" });
      if (import.meta.env.DEV)
        logger.error("[SettingsTabs] Profile update failed:", err);
      setProfileMessage({
        type: "error",
        text: t("settings.account.profileUpdateError"),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t("settings.account.title")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("settings.account.description")}
        </p>
      </div>
      <form
        onSubmit={handleSubmit(onSaveProfile)}
        noValidate
        className="p-6 space-y-4"
      >
        <OfflineFormNotice />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
            <OptimizedImage
              src={
                avatarUrl ??
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId ?? "default"}`
              }
              alt={t("settings.account.avatarAlt")}
              className="w-full h-full object-cover"
            />
          </div>
          {/* FIXED: Camera button disabled until photo upload feature is implemented */}
          <button
            type="button"
            disabled
            title={t("settings.account.changePhotoUnavailable")}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            {t("settings.account.changePhoto")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="settings-fullname"
              className="text-sm font-bold text-slate-700 dark:text-slate-300"
            >
              {t("settings.account.fullName")}
            </label>
            <input
              id="settings-fullname"
              type="text"
              {...register("fullName")}
              aria-invalid={!!profileErrors.fullName}
              aria-describedby={
                profileErrors.fullName ? "settings-fullname-error" : undefined
              }
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 aria-[invalid=true]:border-red-400"
            />
            {profileErrors.fullName && (
              <p
                id="settings-fullname-error"
                className="text-xs text-red-500 mt-1"
              >
                {profileErrors.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t("common.email")}
            </label>
            <input
              type="email"
              value={displayEmail}
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t("settings.account.role")}
            </label>
            <input
              type="text"
              value={roleLabel}
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        {profileMessage && (
          <div
            className={cn(
              "text-sm px-4 py-2 rounded-xl",
              profileMessage.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
            )}
          >
            {profileMessage.text}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingProfile
              ? t("settings.saving")
              : t("settings.account.saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
export function SecurityTab() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChangePassword = useCallback(async () => {
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: t("settings.security.newPasswordMinError"),
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: t("settings.security.confirmPasswordMismatch"),
      });
      return;
    }
    setSavingPassword(true);
    try {
      const { data: user } = await db.auth.getUser();
      const email = user.user?.email;
      if (email) {
        const { error: verifyError } = await db.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (verifyError) {
          throw new Error(t("settings.security.currentPasswordInvalid"));
        }
      }
      const { error } = await db.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage({
        type: "success",
        text: t("settings.security.passwordChanged"),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      captureError(err, { context: "SettingsTabs.changePassword" });
      if (import.meta.env.DEV)
        logger.error("[SettingsTabs] Password change failed:", err);
      setPasswordMessage({
        type: "error",
        text: t("settings.security.passwordChangeError"),
      });
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("settings.security.title")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.security.description")}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t("settings.security.currentPassword")}
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settings.security.currentPasswordPlaceholder")}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={
                  showPasswords
                    ? t("auth.pages.hidePassword")
                    : t("auth.pages.showPassword")
                }
              >
                {showPasswords ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t("settings.security.newPassword")}
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("settings.security.newPasswordPlaceholder")}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t("settings.security.confirmNewPassword")}
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("settings.security.confirmNewPasswordPlaceholder")}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {passwordMessage && (
            <div
              className={cn(
                "text-sm px-4 py-2 rounded-xl",
                passwordMessage.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
              )}
            >
              {passwordMessage.text}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {savingPassword
                ? t("settings.saving")
                : t("settings.security.changePassword")}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <MFASettings />
      </div>

      <div className="mt-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("settings.privacy.title")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.privacy.description")}
          </p>
        </div>
        <div className="p-6 space-y-3">
          <a
            href="/app/privacy/export-data"
            className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-left transition-colors"
          >
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {t("settings.privacy.exportData")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("settings.privacy.exportDataDescription")}
            </p>
          </a>
          <a
            href="/app/privacy/delete-account"
            className="block w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-left transition-colors"
          >
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              {t("settings.privacy.deleteAccount")}
            </p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
              {t("settings.privacy.deleteAccountDescription")}
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Appearance Tab ────────────────────────────────────────────────────────────
export function AppearanceTab({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t("settings.appearance.title")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("settings.appearance.description")}
        </p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              id: "light" as Theme,
              label: t("settings.appearance.light"),
              Icon: Sun,
            },
            {
              id: "dark" as Theme,
              label: t("settings.appearance.dark"),
              Icon: Moon,
            },
            {
              id: "system" as Theme,
              label: t("settings.appearance.system"),
              Icon: Monitor,
            },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                theme === id
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
              )}
            >
              <Icon
                className={cn(
                  "w-8 h-8",
                  theme === id
                    ? "text-blue-600"
                    : "text-slate-400 dark:text-slate-500",
                )}
              />
              <span
                className={cn(
                  "text-sm font-bold",
                  theme === id
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400",
                )}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
