// Question Difficulty Chart Component
// Shows a horizontal bar chart of correct% vs incorrect% per question

import { AlertTriangle, BarChart2 } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui";
import { useTheme } from "@/contexts/ThemeContext";

import type { QuestionStatsWithQuestion } from "../../api/quizAnalytics.service";

interface QuestionDifficultyChartProps {
  questions: QuestionStatsWithQuestion[];
  isLoading?: boolean;
}

// Color mapping based on difficulty
const getDifficultyColor = (correctPercentage: number): string => {
  if (correctPercentage >= 70) return "#22c55e"; // green
  if (correctPercentage >= 40) return "#eab308"; // yellow
  return "#ef4444"; // red
};

const getDifficultyLabel = (correctPercentage: number): string => {
  if (correctPercentage >= 70) return "Mudah";
  if (correctPercentage >= 40) return "Sedang";
  return "Sulit";
};

// ⚡ Perf: hoisted outside component to prevent new component ref every render
const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      questionText: string;
      correctPercentage: number;
      incorrectPercentage: number;
      totalAnswers: number;
      color: string;
      difficulty: string;
    };
  }>;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="font-bold text-slate-800 dark:text-white mb-1">
          {data.questionText}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Benar:{" "}
          <span className="font-bold text-green-600 dark:text-green-400">
            {data.correctPercentage}%
          </span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Salah:{" "}
          <span className="font-bold text-red-600 dark:text-red-400">
            {data.incorrectPercentage}%
          </span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Total jawaban: <span className="font-bold">{data.totalAnswers}</span>
        </p>
        <p className="text-sm font-bold mt-1" style={{ color: data.color }}>
          Tingkat kesulitan: {data.difficulty}
        </p>
      </div>
    );
  }
  return null;
};

// ⚡ Perf: stable formatter ref — avoids Recharts detecting prop change every render
const xAxisTickFormatter = (value: number) => `${value}%`;

export function QuestionDifficultyChart({
  questions,
  isLoading,
}: QuestionDifficultyChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  // ⚡ Perf: memoize .map().sort() chain — can be 10-50+ questions
  const chartData = useMemo(
    () =>
      questions
        ?.map((q, index) => {
          const correctPercentage =
            q.total_answers > 0
              ? Math.round((q.correct_answers / q.total_answers) * 100)
              : 0;
          const incorrectPercentage = 100 - correctPercentage;

          return {
            question: `Q${index + 1}`,
            questionId: q.question_id,
            questionText: q.question_text,
            correctPercentage,
            incorrectPercentage,
            totalAnswers: q.total_answers,
            difficulty: getDifficultyLabel(correctPercentage),
            color: getDifficultyColor(correctPercentage),
          };
        })
        .sort((a, b) => a.correctPercentage - b.correctPercentage) ?? [],
    [questions],
  );

  // ⚡ Perf: memoize derived filter for hard questions warning
  const hardQuestions = useMemo(
    () => chartData.filter((q) => q.correctPercentage < 40),
    [chartData],
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-4" />
        <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <EmptyState
          icon={<BarChart2 className="w-8 h-8" />}
          title="Belum ada data soal untuk kuis ini."
          description="Data kesulitan soal akan muncul setelah siswa mengerjakan kuis."
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Analisis Kesulitan Soal
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-600 dark:text-slate-400">
              Mudah (&gt;70%)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-600 dark:text-slate-400">
              Sedang (40-70%)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600 dark:text-slate-400">
              Sulit (&lt;40%)
            </span>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={xAxisTickFormatter}
              tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }}
              axisLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
              tickLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
            />
            <YAxis
              type="category"
              dataKey="question"
              width={40}
              tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }}
              axisLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
              tickLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
            />
            <Tooltip
              content={<CustomTooltip />}
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                borderRadius: "0.5rem",
                color: isDark ? "#f1f5f9" : "#0f172a",
              }}
              labelStyle={{ color: isDark ? "#94a3b8" : "#64748b" }}
            />
            <ReferenceLine x={70} stroke="#22c55e" strokeDasharray="3 3" />
            <ReferenceLine x={40} stroke="#eab308" strokeDasharray="3 3" />
            <Bar
              dataKey="correctPercentage"
              stackId="a"
              name="Benar"
              radius={[0, 0, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Bar
              dataKey="incorrectPercentage"
              stackId="a"
              name="Salah"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill="#e2e8f0" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for hardest questions */}
      {hardQuestions.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              Soal yang perlu diperhatikan:
            </p>
          </div>
          <div className="space-y-1">
            {hardQuestions.map((q) => (
              <p
                key={q.questionId}
                className="text-sm text-red-700 dark:text-red-300"
              >
                • {q.question} - Hanya {q.correctPercentage}% siswa menjawab
                benar
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
