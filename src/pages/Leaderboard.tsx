import { useState, useRef, useEffect } from "react";
import { Trophy, Flame, Calendar, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useClassroom } from "@/src/hooks/useClassroomQueries";
import { useLeaderboard, useWeeklyLeaderboard } from "@/src/features/gamification";
import type { LeaderboardEntry } from "@/src/features/gamification";
import { SkeletonCard, EmptyState } from "@/src/components/ui";
import { cn } from "@/src/utils/cn";
import { useAuth } from "@/src/contexts/AuthContext";

type LeaderboardView = 'alltime' | 'weekly';

export function Leaderboard() {
  const { activeClassroomId } = useClassroom();
  const [view, setView] = useState<LeaderboardView>('alltime');
  const { user } = useAuth();
  const currentUserRef = useRef<HTMLDivElement>(null);

  const alltime = useLeaderboard(activeClassroomId);
  const weekly = useWeeklyLeaderboard(activeClassroomId);

  const active = view === 'alltime' ? alltime : weekly;
  const entries = (active.data ?? []) as LeaderboardEntry[];
  const loading = active.isLoading;
  const error = active.error;

  const isCurrentUser = (entry: LeaderboardEntry) => entry.user_id === user?.id;
  const currentUserEntry = entries.find(isCurrentUser);

  // Auto-scroll to current user's row
  useEffect(() => {
    if (currentUserEntry && currentUserRef.current) {
      setTimeout(() => {
        currentUserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [currentUserEntry]);

  if (error) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="text-center py-12 text-red-500">
          Gagal memuat leaderboard. Silakan coba lagi.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full p-8 space-y-6">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex-1 w-full flex items-center justify-center p-8">
        <EmptyState
          icon={<Trophy className="w-12 h-12" />}
          title="Belum ada peringkat"
          description="Kerjakan kuis dan tugas untuk mendapatkan poin!"
        />
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="max-w-4xl mx-auto space-y-8 flex-1 w-full flex flex-col">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          Liga Berlian
        </h1>
        <p className="text-slate-500">20 teratas promosi ke Liga Master</p>

        {/* Toggle All-time / Weekly */}
        <div className="flex justify-center mt-4">
          <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setView('alltime')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                view === 'alltime'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Semua Waktu
            </button>
            <button
              onClick={() => setView('weekly')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                view === 'weekly'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Calendar className="w-4 h-4" />
              Minggu Ini
            </button>
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="flex justify-center items-end gap-2 md:gap-6 h-64 mt-8">
        {/* 2nd Place */}
        {top3[1] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "flex flex-col items-center w-24 md:w-32",
              isCurrentUser(top3[1]) && "relative"
            )}
          >
            {isCurrentUser(top3[1]) && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-20">
                Anda
              </div>
            )}
            <div className="relative mb-4">
              <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-slate-100",
                isCurrentUser(top3[1]) 
                  ? "border-4 border-blue-500 ring-4 ring-blue-200 dark:ring-blue-800/50" 
                  : "border-4 border-slate-300"
              )}>
                <img
                  src={top3[1].profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].profiles?.full_name}`}
                  alt={top3[1].profiles?.full_name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
                2
              </div>
            </div>
            <div className="text-center mb-2">
              <p className={cn(
                "font-bold text-sm md:text-base truncate w-full",
                isCurrentUser(top3[1]) ? "text-blue-600 dark:text-blue-400" : "text-slate-800"
              )}>
                {top3[1].profiles?.full_name || "Siswa"}
              </p>
              <p className="text-yellow-600 font-bold text-sm">
                {top3[1].score} XP
              </p>
            </div>
            <div className={cn(
              "w-full rounded-t-2xl border-t-4",
              isCurrentUser(top3[1]) 
                ? "h-24 bg-gradient-to-t from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 border-blue-400" 
                : "h-24 bg-gradient-to-t from-slate-200 to-slate-100 border-slate-300"
            )} />
          </motion.div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "flex flex-col items-center w-28 md:w-40 z-10",
              isCurrentUser(top3[0]) && "relative"
            )}
          >
            {isCurrentUser(top3[0]) && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-20">
                Anda
              </div>
            )}
            <div className="relative mb-4">
              <CrownIcon className="w-8 h-8 text-yellow-500 fill-yellow-500 absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-md" />
              <div className={cn(
                "w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-lg",
                isCurrentUser(top3[0]) 
                  ? "border-4 border-blue-500 ring-4 ring-blue-200 dark:ring-blue-800/50 bg-blue-50" 
                  : "border-4 border-yellow-400 bg-yellow-50 shadow-yellow-200/50"
              )}>
                <img
                  src={top3[0].profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].profiles?.full_name}`}
                  alt={top3[0].profiles?.full_name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-sm font-bold px-3 py-0.5 rounded-full border-2 border-white shadow-sm">
                1
              </div>
            </div>
            <div className="text-center mb-2">
              <p className={cn(
                "font-bold text-base md:text-lg truncate w-full",
                isCurrentUser(top3[0]) ? "text-blue-600 dark:text-blue-400" : "text-slate-900"
              )}>
                {top3[0].profiles?.full_name || "Siswa"}
              </p>
              <p className={cn(
                "font-bold",
                isCurrentUser(top3[0]) ? "text-blue-600" : "text-yellow-600"
              )}>
                {top3[0].score} XP
              </p>
            </div>
            <div className={cn(
              "w-full rounded-t-2xl border-t-4 shadow-inner",
              isCurrentUser(top3[0]) 
                ? "h-32 bg-gradient-to-t from-blue-200 to-blue-100 dark:from-blue-900/40 dark:to-blue-900/20 border-blue-400" 
                : "h-32 bg-gradient-to-t from-yellow-200 to-yellow-100 border-yellow-400"
            )} />
          </motion.div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "flex flex-col items-center w-24 md:w-32",
              isCurrentUser(top3[2]) && "relative"
            )}
          >
            {isCurrentUser(top3[2]) && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-20">
                Anda
              </div>
            )}
            <div className="relative mb-4">
              <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden",
                isCurrentUser(top3[2]) 
                  ? "border-4 border-blue-500 ring-4 ring-blue-200 dark:ring-blue-800/50 bg-blue-50" 
                  : "border-4 border-orange-300 bg-orange-50"
              )}>
                <img
                  src={top3[2].profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].profiles?.full_name}`}
                  alt={top3[2].profiles?.full_name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
                3
              </div>
            </div>
            <div className="text-center mb-2">
              <p className={cn(
                "font-bold text-sm md:text-base truncate w-full",
                isCurrentUser(top3[2]) ? "text-blue-600 dark:text-blue-400" : "text-slate-800"
              )}>
                {top3[2].profiles?.full_name || "Siswa"}
              </p>
              <p className="text-yellow-600 font-bold text-sm">
                {top3[2].score} XP
              </p>
            </div>
            <div className={cn(
              "w-full rounded-t-2xl border-t-4",
              isCurrentUser(top3[2]) 
                ? "h-20 bg-gradient-to-t from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 border-blue-400" 
                : "h-20 bg-gradient-to-t from-orange-200 to-orange-100 border-orange-300"
            )} />
          </motion.div>
        )}
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 md:p-4"
      >
        <div className="space-y-2">
          {rest.map((entry, index) => (
            <motion.div
              ref={isCurrentUser(entry) ? currentUserRef : null}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={entry.rank}
              className={cn(
                "flex items-center gap-4 p-3 md:p-4 rounded-2xl transition-colors group",
                isCurrentUser(entry) 
                  ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800" 
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className={cn(
                "w-8 text-center font-bold",
                isCurrentUser(entry) ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              )}>
                {entry.rank}
              </div>
              <div className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0",
                isCurrentUser(entry) ? "ring-2 ring-blue-300 dark:ring-blue-700" : ""
              )}>
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800">
                  <img
                    src={entry.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.profiles?.full_name}`}
                    alt={entry.profiles?.full_name || "User"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-bold truncate",
                  isCurrentUser(entry) ? "text-blue-700 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"
                )}>
                  {entry.profiles?.full_name || "Siswa"}
                  {isCurrentUser(entry) && (
                    <span className="ml-2 inline-block bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      Anda
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                  0 hari {/* Streak is currently not available in this query model */}
                </p>
              </div>
              <div className={cn(
                "font-bold text-right shrink-0",
                isCurrentUser(entry) ? "text-blue-600 dark:text-blue-400" : "text-yellow-600 dark:text-yellow-500"
              )}>
                {entry.score} XP
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CrownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}
