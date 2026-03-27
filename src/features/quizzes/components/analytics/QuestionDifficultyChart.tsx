// Question Difficulty Chart Component
// Shows a horizontal bar chart of correct% vs incorrect% per question

import { AlertTriangle } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { QuestionStatsWithQuestion } from '../../api/quizAnalytics.service'

interface QuestionDifficultyChartProps {
  questions: QuestionStatsWithQuestion[]
  isLoading?: boolean
}

// Color mapping based on difficulty
const getDifficultyColor = (correctPercentage: number): string => {
  if (correctPercentage >= 70) return '#22c55e' // green
  if (correctPercentage >= 40) return '#eab308' // yellow
  return '#ef4444' // red
}

const getDifficultyLabel = (correctPercentage: number): string => {
  if (correctPercentage >= 70) return 'Mudah'
  if (correctPercentage >= 40) return 'Sedang'
  return 'Sulit'
}

export function QuestionDifficultyChart({ questions, isLoading }: QuestionDifficultyChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
        <div className="h-64 bg-slate-100 rounded" />
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500">Belum ada data soal untuk kuis ini.</p>
        <p className="text-sm text-slate-400 mt-1">
          Data kesulitan soal akan muncul setelah siswa mengerjakan kuis.
        </p>
      </div>
    )
  }

  // Prepare data for chart
  const chartData = questions
    .map((q, index) => {
      const correctPercentage =
        q.total_answers > 0 ? Math.round((q.correct_answers / q.total_answers) * 100) : 0
      const incorrectPercentage = 100 - correctPercentage

      return {
        question: `Q${index + 1}`,
        questionId: q.question_id,
        questionText: q.question_text,
        correctPercentage,
        incorrectPercentage,
        totalAnswers: q.total_answers,
        difficulty: getDifficultyLabel(correctPercentage),
        color: getDifficultyColor(correctPercentage),
      }
    })
    .sort((a, b) => a.correctPercentage - b.correctPercentage) // Sort by difficulty (hardest first)

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{
      payload: {
        questionText: string
        correctPercentage: number
        incorrectPercentage: number
        totalAnswers: number
        color: string
        difficulty: string
      }
    }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
          <p className="font-bold text-slate-800 mb-1">{data.questionText}</p>
          <p className="text-sm text-slate-600">
            Benar: <span className="font-bold text-green-600">{data.correctPercentage}%</span>
          </p>
          <p className="text-sm text-slate-600">
            Salah: <span className="font-bold text-red-600">{data.incorrectPercentage}%</span>
          </p>
          <p className="text-sm text-slate-600">
            Total jawaban: <span className="font-bold">{data.totalAnswers}</span>
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: data.color }}>
            Tingkat kesulitan: {data.difficulty}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">Analisis Kesulitan Soal</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-600">Mudah (&gt;70%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-600">Sedang (40-70%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600">Sulit (&lt;40%)</span>
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
              tickFormatter={(value) => `${value}%`}
              stroke="#94a3b8"
              fontSize={12}
            />
            <YAxis type="category" dataKey="question" width={40} stroke="#94a3b8" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={70} stroke="#22c55e" strokeDasharray="3 3" />
            <ReferenceLine x={40} stroke="#eab308" strokeDasharray="3 3" />
            <Bar dataKey="correctPercentage" stackId="a" name="Benar" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Bar dataKey="incorrectPercentage" stackId="a" name="Salah" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#e2e8f0" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for hardest questions */}
      {chartData.some((q) => q.correctPercentage < 40) && (
        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-bold text-red-800">Soal yang perlu diperhatikan:</p>
          </div>
          <div className="space-y-1">
            {chartData
              .filter((q) => q.correctPercentage < 40)
              .map((q) => (
                <p key={q.questionId} className="text-sm text-red-700">
                  • {q.question} - Hanya {q.correctPercentage}% siswa menjawab benar
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
