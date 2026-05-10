// Anti-Cheat Hook - Enhanced dengan DevTools detection, keyboard blocking, context menu prevention
// Part of the Quiz Engine Refactor

import { useCallback, useEffect, useRef, useState } from "react";

import * as quizPlayerService from "../api/quizPlayer.service";
import type { AntiCheatEventType } from "../utils/antiCheatLogger";

interface UseAntiCheatOptions {
  attemptId: string | undefined;
}

interface UseAntiCheatResult {
  tabWarning: boolean;
  devToolsWarning: boolean;
  dismissWarning: () => void;
}

// Keyboard shortcut combos yang harus diblokir
const BLOCKED_COMBOS = [
  { key: "F12" },
  { key: "I", ctrlKey: true, shiftKey: true }, // DevTools (Chrome/Firefox)
  { key: "J", ctrlKey: true, shiftKey: true }, // Console (Chrome)
  { key: "C", ctrlKey: true, shiftKey: true }, // DevTools (Chrome)
  { key: "U", ctrlKey: true }, // View Source
  { key: "S", ctrlKey: true }, // Save Page
] as const;

// Threshold deteksi DevTools via window size differential
const DEVTOOLS_THRESHOLD = 160; // pixels

// Interval throttle untuk DevTools signal (hindari flood)
const DEVTOOLS_SIGNAL_COOLDOWN_MS = 10_000;

function isDevToolsOpen(): boolean {
  return (
    window.outerWidth - window.innerWidth > DEVTOOLS_THRESHOLD ||
    window.outerHeight - window.innerHeight > DEVTOOLS_THRESHOLD
  );
}

/**
 * Hook for anti-cheat detection
 * Monitors tab visibility changes, window blur, copy/paste, right-click,
 * keyboard shortcuts berbahaya, dan DevTools opening.
 * Records cheating signals via quizPlayerService.recordCheatingSignal.
 */
export function useAntiCheat({
  attemptId,
}: UseAntiCheatOptions): UseAntiCheatResult {
  const [tabWarning, setTabWarning] = useState(false);
  const [devToolsWarning, setDevToolsWarning] = useState(false);
  const lastDevToolsSignalRef = useRef<number>(0);
  const consecutiveDevToolsCountRef = useRef<number>(0);

  const dismissWarning = useCallback(() => {
    setTabWarning(false);
  }, []);

  useEffect(() => {
    if (!attemptId) return;

    const record = (
      type: AntiCheatEventType,
      extra?: Record<string, unknown>,
    ) => {
      void quizPlayerService.recordCheatingSignal(attemptId, type, {
        timestamp: new Date().toISOString(),
        ...extra,
      });
    };

    // TAB_SWITCH — document visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabWarning(true);
        record("TAB_SWITCH");
        // Auto-dismiss after 5s
        setTimeout(() => setTabWarning(false), 5000);
      }
    };

    // WINDOW_BLUR — user switches to another application window
    const handleWindowBlur = () => {
      record("WINDOW_BLUR");
    };

    // COPY_PASTE — copy or paste events on the document
    const handleCopyPaste = (e: ClipboardEvent) => {
      record("COPY_PASTE", { action: e.type });
    };

    // RIGHT_CLICK — context menu opened (fix: e.preventDefault() ditambahkan)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      record("RIGHT_CLICK");
    };

    // KEYBOARD — blokir shortcut berbahaya, catat print attempt
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P — Print: catat tapi jangan blokir
      if (e.key === "P" && e.ctrlKey && !e.shiftKey && !e.altKey) {
        record("PRINT_ATTEMPT");
        return;
      }

      // Cek apakah combo ini harus diblokir
      const isBlocked = BLOCKED_COMBOS.some((combo) => {
        const keyMatch = e.key === combo.key;
        const ctrlMatch =
          "ctrlKey" in combo ? e.ctrlKey === combo.ctrlKey : true;
        const shiftMatch =
          "shiftKey" in combo ? e.shiftKey === combo.shiftKey : !e.shiftKey;
        return keyMatch && ctrlMatch && shiftMatch;
      });

      if (isBlocked) {
        e.preventDefault();
        e.stopPropagation();
        record("KEYBOARD_SHORTCUT_BLOCKED", { key: e.key });
      }
    };

    // DevTools detection — polling setiap 1 detik
    // Requires 2 consecutive detections before flagging to reduce false-positives
    // from external monitors, browser extensions, and OS-level toolbars.
    const devToolsInterval = setInterval(() => {
      const open = isDevToolsOpen();

      if (open) {
        consecutiveDevToolsCountRef.current += 1;

        if (consecutiveDevToolsCountRef.current >= 2) {
          setDevToolsWarning(true);
          const now = Date.now();
          if (
            now - lastDevToolsSignalRef.current >=
            DEVTOOLS_SIGNAL_COOLDOWN_MS
          ) {
            lastDevToolsSignalRef.current = now;
            record("DEVTOOLS_OPEN");
          }
        }
      } else {
        consecutiveDevToolsCountRef.current = 0;
        setDevToolsWarning(false);
      }
    }, 1000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown, true); // capture phase agar mendahului handler lain

    return () => {
      clearInterval(devToolsInterval);
      consecutiveDevToolsCountRef.current = 0;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [attemptId]);

  return {
    tabWarning,
    devToolsWarning,
    dismissWarning,
  };
}
