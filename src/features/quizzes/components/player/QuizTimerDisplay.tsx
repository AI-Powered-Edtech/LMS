import { useState, useEffect, useCallback, useRef } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/src/utils/cn';

export function useQuizTimer(expiresAt: string | null, timeLimitMinutes: number, onTimeUp: () => void) {
  const calculateInitialTime = () => {
    if (expiresAt) {
      const remainingSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, remainingSeconds);
    }
    return (timeLimitMinutes || 10) * 60;
  };

  const [timeLeft, setTimeLeft] = useState(calculateInitialTime());
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUpRef.current();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Tuned thresholds for real exam durations (30+ min)
  const isWarning = timeLeft <= 300 && timeLeft > 60; // ≤5 min → orange
  const isCritical = timeLeft <= 60;                   // ≤1 min → red + pulse
  const progressColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500';

  return { timeLeft, isWarning, isCritical, progressColor };
}

interface QuizTimerProps {
  timeLeft: number;
}

export function QuizTimerDisplay({ timeLeft }: QuizTimerProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isWarning = timeLeft <= 300 && timeLeft > 60;
  const isCritical = timeLeft <= 60;

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors duration-300',
      isCritical ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 
      isWarning ? 'bg-amber-50 border-amber-200 text-amber-700' : 
      'bg-white border-slate-200 text-slate-700'
    )}>
      <Timer className="w-5 h-5" />
      <span className="font-mono text-lg font-bold min-w-[50px] text-center">{formattedTime}</span>
    </div>
  );
}
