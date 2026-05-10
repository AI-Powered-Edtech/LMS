import "./index.css";

import i18n from "./i18n";

if (typeof window !== "undefined") {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID !== "function" &&
    window.crypto.getRandomValues
  ) {
    window.crypto.randomUUID = function () {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);

      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };
  }
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { logger } from "@/utils/logger";

import App from "./App.tsx";
import { AppProviders } from "./app/providers";
import { validateEnv } from "./config/env.schema";
import {
  normalizeLegacyHashUrl,
  sanitizeRedirectTarget,
} from "./features/auth/utils/authFlow";
import { useToast } from "./hooks/useToast";
import { initApiClient } from "./services/api";
import { getVilHttpBaseUrl } from "./services/api/baseUrl";
import { setAuthProvider } from "./services/auth";
import { createVilAuthProvider } from "./services/auth/vilAuthProvider";
import { setRealtimeProvider } from "./services/realtime";
import { createVilRealtimeProvider } from "./services/realtime/vilRealtimeProvider";
import { setStorageProvider } from "./services/storage";
import { createVilStorageProvider } from "./services/storage/vilStorageProvider";
import { initSentry } from "./utils/sentry";
import { reportWebVitals } from "./utils/webVitals";

// Validate env vars before anything else — fails fast with helpful message
validateEnv();

initApiClient();

const vilApiUrl = getVilHttpBaseUrl();
setAuthProvider(createVilAuthProvider(vilApiUrl));
setRealtimeProvider(createVilRealtimeProvider());
setStorageProvider(createVilStorageProvider(vilApiUrl));

// Initialise Sentry before rendering so errors during boot are captured
initSentry();

const legacyHashPath = normalizeLegacyHashUrl(window.location);
const redirectedPath = sanitizeRedirectTarget(
  new URLSearchParams(window.location.search).get("redirect"),
);

if (window.location.pathname === "/" && redirectedPath) {
  window.history.replaceState(null, "", redirectedPath);
} else if (legacyHashPath) {
  window.history.replaceState(null, "", legacyHashPath);
}

// Guard to prevent double-firing auth redirects from concurrent request failures
let authRedirectPending = false;

// Global handler for unhandled promise rejections
window.addEventListener(
  "unhandledrejection",
  (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : i18n.t("globalErrors.unexpected");

    if (import.meta.env.DEV) {
      logger.error("[Unhandled Rejection]", reason);
    }

    // 1. Chunk / dynamic import failure → dismissable toast with reload action
    if (
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("Loading chunk") ||
      message.includes("Importing a module script failed") ||
      message.includes("Loading CSS chunk")
    ) {
      useToast.getState().addToast({
        type: "warning",
        message: i18n.t("globalErrors.newVersion"),
        description: i18n.t("globalErrors.reloadDescription"),
        action: {
          label: i18n.t("globalErrors.reload"),
          onClick: () => window.location.reload(),
        },
        duration: Infinity,
      });
      return;
    }

    // 2. Auth errors (401/403 or JWT-related) → redirect to login (guarded)
    const status = (reason as { status?: number })?.status;
    if (
      (status === 401 || status === 403 || message.includes("JWT")) &&
      !authRedirectPending
    ) {
      authRedirectPending = true;
      window.location.assign("/login");
      setTimeout(() => {
        authRedirectPending = false;
      }, 2000);
      return;
    }

    // 3. Generic fallback
    useToast.getState().addToast({
      type: "error",
      message: i18n.t("globalErrors.unexpected"),
      description: import.meta.env.DEV ? message : undefined,
    });
  },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);

reportWebVitals();
