import { RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { isAuthSurfacePath } from "@/features/auth/utils/authFlow";
import { usePWA } from "@/hooks/usePWA";

const SNOOZE_DURATION_MS = 60 * 60 * 1000; // 1 jam

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PWAUpdateToast() {
  const location = useLocation();
  const { isUpdateAvailable, updateApp } = usePWA();
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Clear snooze when it expires
  useEffect(() => {
    if (snoozedUntil === null) return;
    const remaining = snoozedUntil - Date.now();
    if (remaining <= 0) {
      setSnoozedUntil(null);
      return;
    }
    const timer = setTimeout(() => setSnoozedUntil(null), remaining);
    return () => clearTimeout(timer);
  }, [snoozedUntil]);

  const isSnoozed = snoozedUntil !== null && Date.now() < snoozedUntil;

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    await updateApp();
    // updateApp triggers reload; setIsUpdating(false) won't be reached in most cases
    setIsUpdating(false);
  }, [updateApp]);

  const handleSnooze = useCallback(() => {
    setSnoozedUntil(Date.now() + SNOOZE_DURATION_MS);
  }, []);

  const visible = isUpdateAvailable && !isSnoozed;
  if (isAuthSurfacePath(location.pathname)) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label="Pembaruan aplikasi tersedia"
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-4 right-4 top-4 z-[90] mx-auto max-w-md"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-white px-4 py-3 shadow-xl dark:border-violet-800 dark:bg-slate-900">
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
              <RefreshCw
                className={`h-5 w-5 text-violet-600 dark:text-violet-400 ${isUpdating ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Versi baru tersedia!
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                EduSync telah diperbarui dengan fitur terbaru
              </p>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 active:bg-violet-800 disabled:cursor-wait disabled:opacity-70 dark:bg-violet-500 dark:hover:bg-violet-400"
              >
                {isUpdating ? "Memperbarui…" : "Perbarui"}
              </button>
              <button
                onClick={handleSnooze}
                aria-label="Ingatkan 1 jam lagi"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
