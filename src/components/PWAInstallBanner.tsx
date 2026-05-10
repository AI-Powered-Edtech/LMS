import { Download, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { isAuthSurfacePath } from "@/features/auth/utils/authFlow";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const SNOOZE_KEY = "edusync_pwa_banner_snoozed";
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp < SNOOZE_DURATION_MS;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PWAInstallBanner() {
  const location = useLocation();
  const { canInstall, promptInstall, isDismissed, dismiss } = usePWAInstall();
  const [snoozed, setSnoozed] = useState(() => isSnoozed());

  // Sync snooze state if localStorage changes in another tab
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === SNOOZE_KEY) {
        setSnoozed(isSnoozed());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      // fail silently
    }
    setSnoozed(true);
    dismiss();
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (!accepted) {
      // User rejected — snooze for 7 days
      handleDismiss();
    }
  };

  const visible = canInstall && !isDismissed && !snoozed;
  if (isAuthSurfacePath(location.pathname)) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="banner"
          aria-label="Install EduSync sebagai aplikasi"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 shadow-xl dark:border-indigo-800 dark:bg-slate-900">
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
              <Download
                className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Install EduSync
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Akses lebih cepat langsung dari layar utama
              </p>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                aria-label="Nanti saja"
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
