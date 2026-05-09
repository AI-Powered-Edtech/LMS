import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { authService } from "@/features/auth/api/authService";
import { clearOAuthRedirectPending } from "@/features/auth/utils/authFlow";
import { usePageTitle } from "@/hooks/usePageTitle";
import { addBreadcrumb, captureError } from "@/utils/sentry";

const CALLBACK_TIMEOUT_MS = 15_000;

export function AuthCallback() {
  const { t } = useTranslation();
  usePageTitle(t("auth.pages.authCallbackPageTitle"));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasStartedRef = useRef(false);
  const [statusText, setStatusText] = useState(
    t("auth.pages.authCallbackVerifyingGoogle"),
  );

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    addBreadcrumb("Auth callback entered", "auth");

    const providerError = searchParams.get("error");
    const providerErrorDescription = searchParams.get("error_description");
    if (providerError) {
      clearOAuthRedirectPending();
      const description =
        providerErrorDescription ?? t("auth.pages.authCallbackProviderError");
      void navigate(
        `/auth/error?reason=provider_error&message=${encodeURIComponent(description)}`,
        { replace: true },
      );
      return;
    }

    const hasOAuthPayload =
      searchParams.has("code") ||
      searchParams.has("token_hash") ||
      searchParams.has("access_token") ||
      searchParams.has("refresh_token");

    if (!hasOAuthPayload) {
      clearOAuthRedirectPending();
      void navigate("/auth/error?reason=malformed_callback", { replace: true });
      return;
    }

    const timer = window.setTimeout(() => {
      clearOAuthRedirectPending();
      void navigate("/auth/error?reason=callback_timeout", { replace: true });
    }, CALLBACK_TIMEOUT_MS);

    void (async () => {
      try {
        setStatusText(t("auth.pages.authCallbackExchangeCode"));
        await authService.exchangeOAuthCode(window.location.href);

        setStatusText(t("auth.pages.authCallbackPreparingWorkspace"));
        const bootstrap = await authService.getAuthBootstrap();
        const destination = authService.resolvePostAuthDestination(bootstrap);
        addBreadcrumb("Auth callback redirecting", "auth", { destination });

        clearOAuthRedirectPending();
        void navigate(destination, { replace: true });
      } catch (error) {
        captureError(error, { context: "AuthCallback.exchangeOAuthCode" });
        clearOAuthRedirectPending();
        const message =
          error instanceof Error
            ? error.message
            : t("auth.pages.authCallbackFailed");
        void navigate(
          `/auth/error?reason=callback_failed&message=${encodeURIComponent(message)}`,
          {
            replace: true,
          },
        );
      } finally {
        window.clearTimeout(timer);
      }
    })();
  }, [navigate, searchParams, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mb-6 text-5xl">🔐</div>
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-400" />
        <h1 className="mb-2 text-2xl font-bold text-white">
          {t("auth.pages.authCallbackPageTitle")}
        </h1>
        <p className="text-sm text-blue-200/80">{statusText}</p>
      </div>
    </div>
  );
}
