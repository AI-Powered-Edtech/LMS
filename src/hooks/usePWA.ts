import { useCallback, useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { logger } from "@/utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  /** True when native install prompt is available */
  isInstallable: boolean;
  /** True when app is running in standalone (installed) mode */
  isInstalled: boolean;
  /** Trigger native install prompt */
  promptInstall: () => Promise<boolean>;
  /** True when device has no network connection */
  isOffline: boolean;
  /** True when a new service worker version is waiting */
  isUpdateAvailable: boolean;
  /** Apply pending update and reload */
  updateApp: () => Promise<void>;
  /** True when SW registered and offline-ready */
  isOfflineReady: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePWA(): PWAState {
  // ── Install prompt ───────────────────────────────────────────
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => detectInstalled());

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      deferredPrompt.current = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const prompt = deferredPrompt.current;
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;
    setIsInstallable(false);
    return outcome === "accepted";
  }, []);

  // ── Offline status ───────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Service Worker update ────────────────────────────────────
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (import.meta.env.DEV) {
        logger.warn("[usePWA] SW registered", r);
      }
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        logger.warn("[usePWA] SW registration error", error);
      }
    },
  });

  const updateApp = useCallback(async () => {
    await updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    isOffline,
    isUpdateAvailable: needRefresh,
    updateApp,
    isOfflineReady: offlineReady,
  };
}
