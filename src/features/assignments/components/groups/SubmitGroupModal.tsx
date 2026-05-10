import { UploadCloud } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SubmitGroupModal({ isPending, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center"
      >
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Serahkan Tugas Kelompok?
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Tugas akan diserahkan atas nama seluruh anggota kelompok. Pastikan
          semua anggota telah menyelesaikan bagiannya.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-70"
          >
            {isPending ? "Mengirim..." : "Ya, Serahkan"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
