import { ArrowRight, Star, Trophy, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/cn";

interface ModuleCompletionModalProps {
  moduleTitle: string;
  onContinue: () => void;
  onClose: () => void;
  hasNextModule: boolean;
  xpEarned?: number;
}

export function ModuleCompletionModal({
  moduleTitle,
  onContinue,
  onClose,
  hasNextModule,
  xpEarned,
}: ModuleCompletionModalProps) {
  const firedRef = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (firedRef.current || reducedMotion) return;
    firedRef.current = true;

    import("canvas-confetti")
      .then(({ default: confetti }) => {
        void confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
          colors: ["#6366f1", "#3b82f6", "#f59e0b", "#10b981", "#f43f5e"],
        });
        setTimeout(() => {
          void confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.5, x: 0.2 },
            angle: 60,
          });
          void confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.5, x: 0.8 },
            angle: 120,
          });
        }, 250);
      })
      .catch(() => {});
  }, [reducedMotion]);

  // Keyboard & focus management (A11-H1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    continueRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={reducedMotion ? false : { scale: 0.82, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { scale: 0.82, opacity: 0, y: 20 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", damping: 18, stiffness: 280 }
        }
        className={cn(
          "relative rounded-3xl p-8 shadow-2xl text-center max-w-md mx-4 w-full overflow-hidden",
          "bg-white dark:bg-slate-900",
          "border border-slate-100 dark:border-slate-800",
        )}
      >
        {/* Decorative gradient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/10 dark:from-amber-500/10 dark:to-orange-500/5 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-400/10 dark:from-blue-500/10 dark:to-indigo-500/5 blur-2xl" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className={cn(
            "absolute top-4 right-4 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors z-10",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
          )}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy icon with pulse ring */}
        <div className="relative w-24 h-24 mx-auto mb-5">
          <motion.div
            animate={reducedMotion ? {} : { scale: [1, 1.12, 1] }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }
            className="absolute inset-0 rounded-full bg-amber-200/60 dark:bg-amber-500/20"
          />
          <div
            className={cn(
              "relative w-24 h-24 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30",
              "border-2 border-amber-200 dark:border-amber-700/50",
              "shadow-lg shadow-amber-100 dark:shadow-amber-900/20",
            )}
          >
            <Trophy className="w-11 h-11 text-amber-500 dark:text-amber-400" />
          </div>
          {/* Star accents */}
          <motion.div
            animate={reducedMotion ? {} : { rotate: 360 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 6, repeat: Infinity, ease: "linear" }
            }
            className="absolute -top-1 -right-1"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 dark:text-amber-500 dark:fill-amber-500" />
          </motion.div>
        </div>

        {/* Heading */}
        <motion.h2
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.1 }}
          className="text-2xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent"
        >
          Modul Selesai!
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.15 }}
          className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed"
        >
          Selamat! Anda telah menyelesaikan
          <br />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {moduleTitle}
          </span>
        </motion.p>

        {/* Achievement pill */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.2 }}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold",
            xpEarned && xpEarned > 0 ? "mb-3" : "mb-6",
            "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700",
            "dark:from-green-900/40 dark:to-emerald-900/30 dark:text-green-300",
            "border border-green-200 dark:border-green-700/50",
          )}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          Pencapaian Terbuka
        </motion.div>

        {/* XP Earned */}
        {xpEarned && xpEarned > 0 ? (
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.25 }}
            className="text-2xl font-black text-yellow-400 dark:text-amber-400 mb-6 tracking-tight"
          >
            +{xpEarned} XP
          </motion.p>
        ) : null}

        {/* CTA buttons */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.25 }}
          className="flex flex-col gap-3"
        >
          <button
            ref={continueRef}
            onClick={onContinue}
            className={cn(
              "flex items-center justify-center gap-2 w-full px-6 py-3.5 font-semibold rounded-xl transition-all duration-200",
              "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
              "dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600",
              "text-white shadow-lg shadow-blue-200/60 dark:shadow-blue-900/40",
              "hover:scale-[1.02] active:scale-[0.98]",
            )}
          >
            {hasNextModule ? "Lanjut ke Modul Berikutnya" : "Kembali ke Kursus"}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
          >
            Tetap di halaman ini
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
