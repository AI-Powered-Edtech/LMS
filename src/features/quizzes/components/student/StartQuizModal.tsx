import { motion } from 'motion/react';
import { X, Play, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export function StartQuizModal({ pendingQuiz, isStarting, onClose, onStart }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
          <Play className="w-8 h-8 text-white fill-current" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
          {pendingQuiz.isResume ? 'Lanjutkan Kuis?' : 'Mulai Kuis?'}
        </h2>
        <p className="text-slate-500 text-center mb-6">{pendingQuiz.title}</p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
            <span className="text-sm font-medium text-slate-500">Jumlah Soal</span>
            <span className="font-bold text-slate-800">{pendingQuiz.quiz_questions?.length || 0} soal</span>
          </div>
          {(pendingQuiz.time_limit_minutes > 0) && (
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
              <span className="text-sm font-medium text-slate-500">Batas Waktu</span>
              <span className="font-bold text-slate-800">{pendingQuiz.time_limit_minutes} menit</span>
            </div>
          )}
          {pendingQuiz.max_attempts && (
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
              <span className="text-sm font-medium text-slate-500">Kesempatan</span>
              <span className="font-bold text-slate-800">{pendingQuiz.max_attempts}× percobaan</span>
            </div>
          )}
        </div>

        {pendingQuiz.isResume ? (
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
            <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-bold mb-1">Anda memiliki kuis yang masih berjalan.</p>
              <p>Waktu yang tersisa akan dilanjutkan dari sisa waktu sebelumnya. Harap segera diselesaikan.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-bold mb-1">Peringatan Waktu!</p>
              <p>Setelah Anda menekan tombol mulai, timer akan langsung berjalan. Waktu tidak dapat dihentikan sementara.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onStart(pendingQuiz)}
            disabled={isStarting}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            {isStarting ? (pendingQuiz.isResume ? 'Melanjutkan...' : 'Memulai...') : (pendingQuiz.isResume ? 'Lanjutkan Kuis' : 'Mulai Kuis')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
