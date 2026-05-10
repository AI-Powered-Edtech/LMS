/**
 * Push permission prompt banner
 *
 * Shown to users who have not yet subscribed to push notifications.
 * - Bahasa Indonesia text
 * - Dark mode support
 * - 7-day dismiss cooldown persisted in localStorage
 * - Handles 'denied' state with browser instructions
 */

import { Bell, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";

import { usePushSubscription } from "../hooks/usePushSubscription";

// ── Constants ─────────────────────────────────────────────────────────────────

const DISMISS_KEY = "edusync:push-prompt-dismissed-at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // localStorage may be unavailable
    if (import.meta.env.DEV)
      logger.warn("[PushPermissionPrompt] localStorage write failed");
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PushPermissionPrompt() {
  const { isSupported, permission, isSubscribed, subscribe, isLoading, error } =
    usePushSubscription();

  const [dismissed, setDismissed] = useState(true); // hidden by default until check

  // Check dismiss state on mount
  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    persistDismiss();
    setDismissed(true);
  }, []);

  const handleSubscribe = useCallback(async () => {
    await subscribe();
  }, [subscribe]);

  // ── Don't render if not applicable ──────────────────────────────────────

  // Already subscribed
  if (isSubscribed) return null;

  // Not supported by browser
  if (!isSupported) return null;

  // Dismissed within cooldown
  if (dismissed && permission !== "denied") return null;

  // ── Denied state ────────────────────────────────────────────────────────

  if (permission === "denied") {
    return (
      <div
        role="alert"
        className={cn(
          "mx-auto max-w-lg rounded-2xl border p-4",
          "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Notifikasi diblokir oleh browser
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80">
              Untuk mengaktifkan notifikasi push, buka pengaturan browser Anda
              dan izinkan notifikasi untuk situs ini. Biasanya, klik ikon gembok
              di sebelah kiri bilah alamat lalu ubah pengaturan notifikasi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Default prompt ──────────────────────────────────────────────────────

  return (
    <div
      role="status"
      className={cn(
        "mx-auto max-w-lg rounded-2xl border p-4",
        "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Aktifkan Notifikasi Push
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Dapatkan pemberitahuan tentang tugas baru, nilai, dan pengumuman
          </p>

          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isLoading}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                isLoading
                  ? "cursor-not-allowed bg-blue-400 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500",
              )}
            >
              {isLoading ? "Mengaktifkan..." : "Aktifkan"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
              )}
            >
              Nanti
            </button>
          </div>
        </div>

        {/* Close icon button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup"
          className={cn(
            "shrink-0 rounded-lg p-1 transition-colors",
            "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
            "focus:outline-none focus:ring-2 focus:ring-slate-400",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
