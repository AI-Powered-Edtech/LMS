import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-4 pointer-events-none"
        >
          <div className="bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-3 text-sm pointer-events-auto">
            <div className="bg-red-500/20 p-1.5 rounded-full">
              <WifiOff className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <span className="font-bold">Anda sedang offline.</span>
              <span className="font-medium text-slate-300 hidden sm:inline ml-1">Progress disimpan secara lokal.</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
