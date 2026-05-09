import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface OnboardingLayoutProps {
  children: ReactNode;
  email?: string;
}

export function OnboardingLayout({ children, email }: OnboardingLayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            {t("onboardingLayout.welcomeTitle")}
          </h1>
          {email && (
            <p className="text-slate-400 text-sm">
              {t("onboardingLayout.signedInAs")}{" "}
              <span className="text-white font-medium">{email}</span>
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
