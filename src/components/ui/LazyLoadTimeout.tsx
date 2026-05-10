import { RefreshCcw, WifiOff } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface LazyLoadTimeoutProps {
  /** Fallback shown while loading (before timeout) */
  children: ReactNode;
  /** Timeout in ms before showing the error state (default: 15000) */
  timeout?: number;
}

/**
 * Wraps a Suspense fallback. If the lazy chunk hasn't loaded after `timeout` ms,
 * shows a friendly error with a retry button.
 */
export function LazyLoadTimeout({
  children,
  timeout = 15_000,
}: LazyLoadTimeoutProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeout);
    return () => clearTimeout(timer);
  }, [timeout]);

  if (!timedOut) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-4 text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <WifiOff className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
        Halaman terlalu lama dimuat
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
        Koneksi mungkin lambat atau terjadi masalah saat memuat halaman. Silakan
        coba muat ulang.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        <RefreshCcw className="w-4 h-4" />
        Muat Ulang Halaman
      </button>
    </div>
  );
}
