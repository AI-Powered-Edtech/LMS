import { Eye, EyeOff, GraduationCap, Home, Ticket, User } from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormField } from "@/components/ui/FormField";
import type {
  ClassInfo,
  InviteInfo,
} from "@/features/auth/hooks/useLoginState";
import type { RegisterFormData } from "@/shared/schemas/forms";
import { cn } from "@/utils/cn";

// ============================================================
// Types
// ============================================================

type AccountType = "student" | "teacher";
type TeacherMode = "invite" | "personal";

interface RegisterStep1Props {
  registerForm: UseFormReturn<RegisterFormData>;
  error: string;
  submitting: boolean;
  inviteToken: string | null;
  inviteInfo: InviteInfo | null;
  accountType: AccountType;
  onAccountTypeChange: (type: AccountType) => void;
  onSubmit: (data: RegisterFormData) => void;
}

export function RegisterStep1({
  registerForm,
  error,
  submitting,
  inviteToken,
  inviteInfo,
  accountType,
  onAccountTypeChange,
  onSubmit,
}: RegisterStep1Props) {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  // Saat ada invite token, akun akan otomatis dibuat dengan role yang di-set backend
  // (biasanya teacher). Sembunyikan picker untuk menghindari kebingungan.
  const showAccountTypePicker = !inviteToken;

  return (
    <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-4">
      {showAccountTypePicker && (
        <div>
          <label className="block text-white/60 text-xs font-medium mb-1.5">
            {t("auth.registerForm.accountTypeLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <AccountTypeOption
              active={accountType === "student"}
              onClick={() => onAccountTypeChange("student")}
              icon={<User className="w-4 h-4" />}
              label={t("auth.registerForm.student")}
              hint={t("auth.registerForm.studentHint")}
            />
            <AccountTypeOption
              active={accountType === "teacher"}
              onClick={() => onAccountTypeChange("teacher")}
              icon={<GraduationCap className="w-4 h-4" />}
              label={t("auth.registerForm.teacher")}
              hint={t("auth.registerForm.teacherHint")}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          name="firstName"
          control={registerForm.control}
          label={t("auth.registerForm.firstName")}
          labelClassName="text-white/60 text-xs font-medium mb-1.5"
        >
          <input
            placeholder={t("auth.registerForm.firstNamePlaceholder")}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
          />
        </FormField>
        <FormField
          name="lastName"
          control={registerForm.control}
          label={t("auth.registerForm.lastName")}
          labelClassName="text-white/60 text-xs font-medium mb-1.5"
        >
          <input
            placeholder={t("auth.registerForm.lastNamePlaceholder")}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
          />
        </FormField>
      </div>
      <FormField
        name="email"
        control={registerForm.control}
        label={t("common.email")}
        labelClassName="text-white/60 text-xs font-medium mb-1.5"
      >
        <input
          type="email"
          placeholder={t("auth.registerForm.emailPlaceholder")}
          readOnly={!!inviteInfo}
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm disabled:opacity-60"
        />
      </FormField>
      <div className="relative">
        <FormField
          name="password"
          control={registerForm.control}
          label={t("common.password")}
          labelClassName="text-white/60 text-xs font-medium mb-1.5"
        >
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.registerForm.passwordPlaceholder")}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
          />
        </FormField>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-white/40 hover:text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          aria-label={
            showPassword
              ? t("auth.registerForm.hidePassword")
              : t("auth.registerForm.showPassword")
          }
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors mt-2"
      >
        {inviteToken
          ? submitting
            ? t("auth.registerForm.submittingCreateAccount")
            : t("auth.registerForm.createAndJoin")
          : t("auth.registerForm.continue")}
      </button>
    </form>
  );
}

// ============================================================
// AccountTypeOption — helper untuk picker segmented
// ============================================================

function AccountTypeOption({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border transition-colors text-left",
        active
          ? "bg-blue-500/15 border-blue-400/50 text-white"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-[11px] text-white/40">{hint}</span>
    </button>
  );
}

// ============================================================
// RegisterStep2 — branching student (joinCode) / teacher (invite|personal)
// ============================================================

interface RegisterStep2Props {
  accountType: AccountType;
  // Student props
  joinCode: string;
  setJoinCode: (value: string) => void;
  classInfo: ClassInfo | null;
  classLookupLoading: boolean;
  classLookupError: string;
  // Teacher props
  teacherMode: TeacherMode;
  setTeacherMode: (mode: TeacherMode) => void;
  tenantInviteCode: string;
  setTenantInviteCode: (value: string) => void;
  firstName: string;
  // Common
  error: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function RegisterStep2(props: RegisterStep2Props) {
  return props.accountType === "teacher" ? (
    <TeacherStep2 {...props} />
  ) : (
    <StudentStep2 {...props} />
  );
}

function StudentStep2({
  joinCode,
  setJoinCode,
  classInfo,
  classLookupLoading,
  classLookupError,
  error,
  submitting,
  onBack,
  onSubmit,
}: RegisterStep2Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="reg-join-code"
          className="block text-white/60 text-xs font-medium mb-1.5"
        >
          {t("auth.registerForm.joinCodeLabel")}
        </label>
        <input
          id="reg-join-code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder={t("auth.registerForm.joinCodePlaceholder")}
          maxLength={10}
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm tracking-widest font-mono uppercase"
        />
        {classLookupLoading && (
          <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
            <span className="inline-block w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            {t("auth.registerForm.lookupLoading")}
          </p>
        )}
        {classInfo && (
          <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-green-300 text-xs font-semibold">
              {t("auth.registerForm.classFound")}
            </p>
            <p className="text-white/80 text-sm font-medium mt-0.5">
              {classInfo.class_name}
            </p>
            <p className="text-white/40 text-xs">
              {classInfo.teacher_name} · {classInfo.tenant_name}
            </p>
          </div>
        )}
        {classLookupError && joinCode.length >= 5 && (
          <p className="text-red-400 text-xs mt-2">{classLookupError}</p>
        )}
      </div>

      <p className="text-white/30 text-xs text-center">
        {t("auth.registerForm.joinCodeHelp")}
      </p>

      {error && (
        <p
          role="alert"
          className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          {submitting
            ? t("auth.registerForm.submitting")
            : classInfo
              ? t("auth.registerForm.registerAndJoin")
              : t("auth.registerForm.skipAndRegister")}
        </button>
      </div>
    </div>
  );
}

function TeacherStep2({
  teacherMode,
  setTeacherMode,
  tenantInviteCode,
  setTenantInviteCode,
  firstName,
  error,
  submitting,
  onBack,
  onSubmit,
}: RegisterStep2Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-white/60 text-xs font-medium mb-1.5">
          {t("auth.registerForm.teacherModeLabel")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TeacherModeOption
            active={teacherMode === "invite"}
            onClick={() => setTeacherMode("invite")}
            icon={<Ticket className="w-4 h-4" />}
            label={t("auth.registerForm.inviteCode")}
            hint={t("auth.registerForm.inviteCodeHint")}
          />
          <TeacherModeOption
            active={teacherMode === "personal"}
            onClick={() => setTeacherMode("personal")}
            icon={<Home className="w-4 h-4" />}
            label={t("auth.registerForm.personalSpace")}
            hint={t("auth.registerForm.personalSpaceHint")}
          />
        </div>
      </div>

      {teacherMode === "invite" ? (
        <div>
          <label
            htmlFor="reg-tenant-invite"
            className="block text-white/60 text-xs font-medium mb-1.5"
          >
            {t("auth.registerForm.tenantInviteLabel")}
          </label>
          <input
            id="reg-tenant-invite"
            value={tenantInviteCode}
            onChange={(e) => setTenantInviteCode(e.target.value.toUpperCase())}
            placeholder={t("auth.registerForm.tenantInvitePlaceholder")}
            maxLength={32}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm tracking-wider font-mono uppercase"
          />
          <p className="text-white/30 text-xs mt-2">
            {t("auth.registerForm.tenantInviteHelp")}
          </p>
        </div>
      ) : (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <p className="text-indigo-300 text-xs font-semibold">
            {t("auth.registerForm.personalSpaceWillBeCreated")}
          </p>
          <p className="text-white/70 text-sm mt-1">
            {t("auth.registerForm.spaceName")}{" "}
            <span className="font-semibold">
              {firstName || t("auth.registerForm.personalFallbackName")}
            </span>
          </p>
          <p className="text-white/40 text-xs mt-1">
            {t("auth.registerForm.personalSpaceHelp")}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          {submitting
            ? t("auth.registerForm.submitting")
            : teacherMode === "invite"
              ? t("auth.registerForm.joinTenantAndRegister")
              : t("auth.registerForm.createSpaceAndRegister")}
        </button>
      </div>
    </div>
  );
}

function TeacherModeOption({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border transition-colors text-left",
        active
          ? "bg-blue-500/15 border-blue-400/50 text-white"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-[11px] text-white/40">{hint}</span>
    </button>
  );
}
