import { motion } from 'motion/react';
import { Target, Loader2, Play } from 'lucide-react';
import { cn } from '@/src/utils/cn';

export function QuizCard({ quiz, activeAttempt, attemptsCount = 0, onStart, isStarting }: { quiz: any; activeAttempt?: any; attemptsCount?: number; onStart: () => void; isStarting?: boolean }) {
  const timeLimitMin = quiz.time_limit_minutes || 0;
  const maxAttempts = quiz.max_attempts;
  const isAvailable = attemptsCount < maxAttempts || !maxAttempts;
  const availableUntil = quiz.due_at ? new Date(quiz.due_at) : null;
  const isExpired = availableUntil ? availableUntil < new Date() : false;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-2 items-center">
            {activeAttempt ? (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                In Progress
              </span>
            ) : attemptsCount > 0 && !isAvailable ? (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wider">
                Completed
              </span>
            ) : (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                Available
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{quiz.title}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
           <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{quiz.class_name}</span>
           <span className="text-sm text-slate-500">{quiz.quiz_questions?.length || 0} Questions {timeLimitMin > 0 ? `• ${timeLimitMin} Minutes` : ''}</span>
        </div>
        
        {availableUntil && (
           <p className={cn("text-xs font-bold mb-3", isExpired ? "text-red-500" : "text-amber-600")}>
             Due: {availableUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
             {' '}{availableUntil.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
           </p>
        )}

        <p className="text-sm text-slate-600 mb-6 line-clamp-2 flex-1">{quiz.description}</p>

        {activeAttempt && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-blue-600">Progress Pengerjaan</span>
              <span className="text-xs font-bold text-blue-400">Sedang Berjalan</span>
            </div>
            <div className="w-full bg-blue-50 rounded-full h-2 overflow-hidden">
               <div className="bg-blue-500 h-2 rounded-full w-[50%] animate-pulse"></div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mb-6">
          {maxAttempts > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-100 rounded-md">
              <span>Attempt: {Math.min(attemptsCount + (activeAttempt ? 0 : 1), maxAttempts)} / {maxAttempts}</span>
            </div>
          )}
        </div>

        <button 
          onClick={onStart} 
          disabled={isStarting || (!activeAttempt && !isAvailable)} 
          className={cn(
             "w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50",
             activeAttempt ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
          )}
        >
          {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isStarting ? (activeAttempt ? 'Melanjutkan...' : 'Memulai...') : (activeAttempt ? 'Lanjutkan Kuis' : (!isAvailable ? 'Selesai' : 'Mulai Kuis'))}
        </button>
      </div>
    </motion.div>
  );
}
