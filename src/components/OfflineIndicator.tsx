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
          <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold pointer-events-auto">
            <WifiOff className="w-4 h-4" />
            Anda sedang offline. Periksa koneksi internet Anda.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
