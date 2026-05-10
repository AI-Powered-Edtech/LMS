/**
 * NotificationBell — Bell icon that toggles the NotificationCenter panel.
 *
 * Now uses NotificationCenter (with Notifikasi + Pengaturan tabs) instead
 * of the legacy flat NotificationPanel.
 */

import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useNotifications } from "../hooks/useNotifications";
import { NotificationCenter } from "./NotificationCenter";

type CenterTab = "notifications" | "settings";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CenterTab>("notifications");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifikasi (${unreadCount} belum dibaca)`
            : "Notifikasi"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Pusat notifikasi"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50"
          >
            <NotificationCenter
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={() => setOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
