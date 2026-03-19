import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowRight, X } from 'lucide-react';

interface ModuleCompletionModalProps {
  moduleTitle: string;
  onContinue: () => void;
  onClose: () => void;
  hasNextModule: boolean;
}

export function ModuleCompletionModal({
  moduleTitle,
  onContinue,
  onClose,
  hasNextModule,
}: ModuleCompletionModalProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }).catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md mx-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Trophy className="w-10 h-10 text-amber-500" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Modul Selesai!</h2>
        <p className="text-slate-500 mb-6">
          Anda telah menyelesaikan<br />
          <span className="font-semibold text-slate-700">{moduleTitle}</span>
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-200"
          >
            {hasNextModule ? 'Lanjut ke Modul Berikutnya' : 'Kembali ke Course'}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
