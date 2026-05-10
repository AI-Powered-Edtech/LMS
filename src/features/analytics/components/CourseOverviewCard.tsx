import { Activity, BookOpen, CheckCircle, Users } from "lucide-react";
import { motion } from "motion/react";

import { Card, Skeleton } from "@/components/ui";
import { cn } from "@/utils/cn";

import type { CourseAnalytics } from "../types";
import { formatPct, pctColor } from "../utils/formatters";

interface CourseOverviewCardProps {
  data: CourseAnalytics | null;
  isLoading: boolean;
}

interface StatItem {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}

export function CourseOverviewCard({
  data,
  isLoading,
}: CourseOverviewCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const activePct =
    data.total_students > 0
      ? Math.round((data.active_students_7d / data.total_students) * 100)
      : 0;

  const stats: StatItem[] = [
    {
      label: "Total Siswa",
      value: String(data.total_students),
      sub: `${data.struggling_students} kesulitan`,
      icon: <Users className="h-6 w-6" />,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      label: "Aktif 7 Hari",
      value: String(data.active_students_7d),
      sub: `${activePct}% dari total`,
      icon: <Activity className="h-6 w-6" />,
      iconBg:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    },
    {
      label: "Rata-rata Selesai",
      value: formatPct(data.avg_completion_pct),
      icon: <CheckCircle className="h-6 w-6" />,
      iconBg:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      valueColor: pctColor(data.avg_completion_pct),
    },
    {
      label: "Total Pelajaran",
      value: String(data.total_lessons),
      icon: <BookOpen className="h-6 w-6" />,
      iconBg:
        "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <h3
                  className={cn(
                    "mt-1 text-2xl font-bold text-slate-900 dark:text-white",
                    stat.valueColor,
                  )}
                >
                  {stat.value}
                </h3>
                {stat.sub && (
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {stat.sub}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  stat.iconBg,
                )}
              >
                {stat.icon}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
