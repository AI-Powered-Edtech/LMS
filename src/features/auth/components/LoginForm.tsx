import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { FormField } from "@/components/ui/FormField";
import type { LoginFormData } from "@/shared/schemas/forms";

interface LoginFormProps {
  loginForm: UseFormReturn<LoginFormData>;
  error: string;
  setError: (value: string) => void;
  submitting: boolean;
  onSubmit: (data: LoginFormData) => void;
}

export function LoginForm({
  loginForm,
  error,
  setError,
  submitting,
  onSubmit,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  return (
    <form
      onSubmit={loginForm.handleSubmit(onSubmit, () => {
        const errors = loginForm.formState.errors;
        if (errors.email) {
          setError(
            errors.email.message || t("auth.loginForm.errors.invalidEmail"),
          );
        } else if (errors.password) {
          setError(
            errors.password.message ||
              t("auth.loginForm.errors.passwordRequired"),
          );
        } else {
          setError(t("auth.loginForm.errors.missingCredentials"));
        }
      })}
      className="space-y-4"
    >
      <FormField
        name="email"
        control={loginForm.control}
        label={t("common.email")}
        labelClassName="text-white/60 text-xs font-medium mb-1.5"
      >
        <input
          type="email"
          placeholder={t("auth.loginForm.emailPlaceholder")}
          autoComplete="email"
          data-testid="login-email-input"
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            loginForm.setValue("email", e.currentTarget.value, {
              shouldValidate: true,
            });
            if (error) setError("");
          }}
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
        />
      </FormField>
      <div className="relative">
        <FormField
          name="password"
          control={loginForm.control}
          label={t("common.password")}
          labelClassName="text-white/60 text-xs font-medium mb-1.5"
        >
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            data-testid="login-password-input"
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              loginForm.setValue("password", e.currentTarget.value, {
                shouldValidate: true,
              });
              if (error) setError("");
            }}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
          />
        </FormField>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-white/40 hover:text-white/60 transition-colors"
          aria-label={
            showPassword
              ? t("auth.loginForm.hidePassword")
              : t("auth.loginForm.showPassword")
          }
          data-testid="login-toggle-password"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="flex justify-end mt-1">
        <Link
          data-testid="login-forgot-password-link"
          to="/forgot-password"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {t("auth.loginForm.forgotPassword")}
        </Link>
      </div>
      {error && (
        <p
          id="login-error"
          role="alert"
          className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        data-testid="login-submit-button"
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors mt-2"
      >
        {submitting ? t("auth.loginForm.submitting") : t("auth.login")}
      </button>
    </form>
  );
}
