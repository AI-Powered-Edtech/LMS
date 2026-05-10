import { useCallback, useEffect, useRef, useState } from "react";

import { logger } from "@/utils/logger";

const STORAGE_KEY = "edusync_pwa_install_dismissed";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  /** True when the browser has a deferred install prompt available */
  canInstall: boolean;
  /** Trigger the native install prompt. Returns true if user accepted. */
  promptInstall: () => Promise<boolean>;
  /** True if the user dismissed the prompt within the last 30 days */
  isDismissed: boolean;
  /** Dismiss the prompt and record timestamp in localStorage */
  dismiss: () => void;
}

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

export function usePWAInstall(): PWAInstallState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => isDismissedRecently());

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect if app was installed
    const installedHandler = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const prompt = deferredPrompt.current;
    if (!prompt) return false;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;
    setCanInstall(false);

    return outcome === "accepted";
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable — fail silently
      if (import.meta.env.DEV)
        logger.warn(
          "[usePWAInstall] localStorage write failed for dismiss state",
        );
    }
    setIsDismissed(true);
  }, []);

  return { canInstall, promptInstall, isDismissed, dismiss };
}
