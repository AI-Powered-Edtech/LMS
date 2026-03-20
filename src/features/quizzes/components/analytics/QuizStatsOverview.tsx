// Quiz Stats Overview Component
// Shows summary statistics cards for a quiz

import { Users, Trophy, Clock, Target, TrendingUp } from 'lucide-react';
import { cn } from '../../../../utils/cn';

// Format time helper
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
import type { QuizStats } from '../../api/quizAnalytics.service';

interface QuizStatsOverviewProps {
  stats: QuizStats | null;
  isLoading?: boolean;
}

export function QuizStatsOverview({ stats, isLoading }: QuizStatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
            <div className="h-10 w-10 bg-slate-200 rounded-xl mb-3" />
            <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500">Belum ada data statistik untuk kuis ini.</p>
        <p className="text-sm text-slate-400 mt-1">Statistik akan muncul setelah siswa mengerjakan kuis.</p>
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Percobaan',
      value: stats.total_attempts,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      subtitle: `${stats.total_unique_students} siswa`,
    },
    {
      label: 'Rata-rata Nilai',
      value: `${stats.avg_score}%`,
      icon: Trophy,
      color: 'bg-amber-100 text-amber-600',
      subtitle: `Median: ${stats.median_score}%`,
    },
    {
      label: 'Tingkat Kelulusan',
      value: `${stats.pass_rate}%`,
      icon: TrendingUp,
      color: stats.pass_rate >= 70 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600',
      subtitle: stats.pass_rate >= 70 ? 'Baik' : 'Perlu ditingkatkan',
    },
    {
      label: 'Rata-rata Waktu',
      value: formatTime(stats.avg_time_seconds),
      icon: Clock,
      color: 'bg-purple-100 text-purple-600',
      subtitle: `Terbaik: ${stats.lowest_score}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", card.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-800">{card.value}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{card.label}</p>
            <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
