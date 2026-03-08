import { useState, useEffect } from "react";
import { Trophy, Flame, Medal } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion } from "motion/react";

interface User {
  id: string;
  name: string;
  xp: number;
  streak: number;
  avatar: string;
}

const generateUsers = (count: number): User[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `user-${i}`,
    name: `Student ${i + 1}`,
    xp: 10000 - i * 150,
    streak: Math.floor(Math.random() * 30),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
  }));
};

export function Leaderboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUsers(generateUsers(20));
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loading) {
      setLoading(true);
      setTimeout(() => {
        setUsers((prev) => [
          ...prev,
          ...generateUsers(10).map((u) => ({
            ...u,
            id: `user-${prev.length + Math.random()}`,
          })),
        ]);
        setLoading(false);
      }, 1000);
    }
  };

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="max-w-4xl mx-auto space-y-8 flex-1 w-full flex flex-col">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          Liga Berlian
        </h1>
        <p className="text-slate-500">20 teratas promosi ke Liga Master</p>
      </div>

      {/* Podium */}
      <div className="flex justify-center items-end gap-2 md:gap-6 h-64 mt-8">
        {/* 2nd Place */}
        {top3[1] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center w-24 md:w-32"
          >
            <div className="relative mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-300 overflow-hidden bg-slate-100">
                <img
                  src={top3[1].avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
                2
              </div>
            </div>
            <div className="text-center mb-2">
              <p className="font-bold text-slate-800 text-sm md:text-base truncate w-full">
                {top3[1].name}
              </p>
              <p className="text-yellow-600 font-bold text-sm">
                {top3[1].xp} XP
              </p>
            </div>
            <div className="w-full h-24 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl border-t-4 border-slate-300" />
          </motion.div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center w-28 md:w-40 z-10"
          >
            <div className="relative mb-4">
              <CrownIcon className="w-8 h-8 text-yellow-500 fill-yellow-500 absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-md" />
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-400 overflow-hidden bg-yellow-50 shadow-lg shadow-yellow-200/50">
                <img
                  src={top3[0].avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-sm font-bold px-3 py-0.5 rounded-full border-2 border-white shadow-sm">
                1
              </div>
            </div>
            <div className="text-center mb-2">
              <p className="font-bold text-slate-900 text-base md:text-lg truncate w-full">
                {top3[0].name}
              </p>
              <p className="text-yellow-600 font-bold">{top3[0].xp} XP</p>
            </div>
            <div className="w-full h-32 bg-gradient-to-t from-yellow-200 to-yellow-100 rounded-t-2xl border-t-4 border-yellow-400 shadow-inner" />
          </motion.div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center w-24 md:w-32"
          >
            <div className="relative mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-orange-300 overflow-hidden bg-orange-50">
                <img
                  src={top3[2].avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
                3
              </div>
            </div>
            <div className="text-center mb-2">
              <p className="font-bold text-slate-800 text-sm md:text-base truncate w-full">
                {top3[2].name}
              </p>
              <p className="text-yellow-600 font-bold text-sm">
                {top3[2].xp} XP
              </p>
            </div>
            <div className="w-full h-20 bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-2xl border-t-4 border-orange-300" />
          </motion.div>
        )}
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-2 md:p-4"
        onScroll={handleScroll}
      >
        <div className="space-y-2">
          {rest.map((user, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={user.id}
              className="flex items-center gap-4 p-3 md:p-4 rounded-2xl hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 text-center font-bold text-slate-400 group-hover:text-slate-600">
                {index + 4}
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 overflow-hidden shrink-0">
                <img
                  src={user.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                  {user.streak} hari
                </p>
              </div>
              <div className="font-bold text-yellow-600 text-right shrink-0">
                {user.xp} XP
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="py-4 text-center text-slate-500 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              Memuat...
            </div>
          )}
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
