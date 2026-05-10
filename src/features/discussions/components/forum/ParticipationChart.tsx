import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "@/contexts/ThemeContext";

interface ParticipationChartProps {
  data: Array<{
    date: string;
    posts: number;
    comments: number;
    total_activity: number;
  }>;
}

export function ParticipationChart({ data }: ParticipationChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Format data for chart
  const formatted = useMemo(
    () =>
      data.map((d) => {
        const date = new Date(d.date);
        return {
          ...d,
          label: `${date.getDate()}/${date.getMonth() + 1}`,
          fullDate: date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        };
      }),
    [data],
  );

  const tooltipFormatter = (
    value: unknown,
    name: string | number | undefined,
  ): [string, string] => {
    const labels = {
      posts: "Postingan",
      comments: "Komentar",
      total_activity: "Total Aktivitas",
    };
    const key = String(name ?? "");
    return [`${value}`, labels[key as keyof typeof labels] || key];
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
        <p className="text-sm">Belum ada data partisipasi untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
        Tren Partisipasi Harian
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formatted}
            margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#334155" : "#e2e8f0"}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }}
              axisLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
              tickLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }}
              axisLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
              tickLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
            />
            <Tooltip
              formatter={tooltipFormatter}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
                }
                return label;
              }}
              contentStyle={{
                fontSize: 12,
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                borderRadius: "0.5rem",
                color: isDark ? "#f1f5f9" : "#0f172a",
              }}
              labelStyle={{ color: isDark ? "#94a3b8" : "#64748b" }}
            />
            <Line
              type="monotone"
              dataKey="posts"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              activeDot={{
                r: 6,
                stroke: "#3b82f6",
                strokeWidth: 2,
                fill: "#ffffff",
              }}
            />
            <Line
              type="monotone"
              dataKey="comments"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
              activeDot={{
                r: 6,
                stroke: "#10b981",
                strokeWidth: 2,
                fill: "#ffffff",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Postingan
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Komentar
          </span>
        </div>
      </div>
    </div>
  );
}
