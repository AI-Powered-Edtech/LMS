import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function SessionManager() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        await signOut();
        toast('Sesi Anda telah berakhir karena tidak ada aktivitas.', 'error', 5000);
      }, SESSION_TIMEOUT);
    };

    resetTimer();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [user, signOut, toast]);

  return null;
}
