import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { Onboarding } from "../Onboarding";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { useTheme } from "@/src/contexts/ThemeContext";

const hiddenNavPaths = ["/lesson", "/grader", "/kiosk"];

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  if (!isOffline) return null;

  return (
    <div className="bg-red-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 z-[100] relative shadow-md">
      <WifiOff className="w-4 h-4" />
      <span>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</span>
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const isHidden = hiddenNavPaths.includes(location.pathname);
  const { theme } = useTheme();

  return (
    <div className={`flex h-[100dvh] overflow-hidden font-sans flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <OfflineBanner />
      <div className="flex-1 flex overflow-hidden relative">
        <Onboarding />
        {!isHidden && <Sidebar />}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {!isHidden && <Header />}
          <main className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col ${isHidden ? 'p-0' : 'p-2 sm:p-4 md:p-8 pb-24 md:pb-8'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`${isHidden ? 'max-w-none' : 'max-w-5xl'} mx-auto w-full flex-1 flex flex-col`}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          {!isHidden && <BottomNav />}
        </div>
      </div>
    </div>
  );
}
