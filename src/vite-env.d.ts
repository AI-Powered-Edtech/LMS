/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ── VIL Backend ───────────────────────────────────────────────────────────
  readonly VITE_API_BACKEND?: "vil"; // Backend selector (VIL Rust backend only)
  readonly VITE_API_URL?: string; // VIL API base URL (default: http://localhost:8080)
  readonly VITE_WS_URL?: string; // VIL WebSocket URL (default: ws://localhost:8080/ws)
  readonly VITE_STORAGE_BACKEND?: "vil";
  readonly VITE_STORAGE_DUAL_WRITE?: string;
  readonly VITE_STORAGE_PRIMARY?: string;
  readonly VITE_CDN_URL?: string;
  readonly VITE_REALTIME_BACKEND?: "vil";

  // ── Observability ────────────────────────────────────────────────────────
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ORG?: string;
  readonly VITE_SENTRY_PROJECT?: string;
  readonly VITE_SENTRY_AUTH_TOKEN?: string;

  // ── Push Notifications ───────────────────────────────────────────────────
  readonly VITE_VAPID_PUBLIC_KEY?: string;

  // ── Dev Helpers ──────────────────────────────────────────────────────────
  readonly VITE_DEV_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
