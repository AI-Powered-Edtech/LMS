import { CheckCircle2, Clock, TrendingDown, TrendingUp } from "lucide-react";

interface GradebookStatsProps {
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  highestStudent: string;
  lowestStudent: string;
}

export function GradebookStats({
  classAverage,
  highestScore,
  lowestScore,
  highestStudent,
  lowestStudent,
}: GradebookStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
            Rata-rata Kelas
          </span>
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">
          {classAverage}%
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
            Tertinggi
          </span>
          <div className="w-8 h-8 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">
          {highestScore}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {highestStudent}
        </p>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
            Terendah
          </span>
          <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">
          {lowestScore}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {lowestStudent}
        </p>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
            Raport
          </span>
          <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">
          0
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Belum digenerate
        </p>
      </div>
    </div>
  );
}
