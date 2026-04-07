// EduSync LMS — Survey Results Dashboard
// Displays aggregated survey results with charts and export functionality

import { Download, Loader2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Card } from '@/components/ui/Card'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { type SurveyAnalyticsResult, surveyAnalyticsService } from '../api/surveyAnalytics'
import { exportSurveyToCSV } from '../utils/surveyExport'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SurveyResultsDashboardProps {
  surveyId: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SurveyResultsDashboard({ surveyId, className }: SurveyResultsDashboardProps) {
  const [data, setData] = useState<SurveyAnalyticsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const addToast = useToast((s) => s.addToast)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await surveyAnalyticsService.getSurveyResults(surveyId)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat hasil survei.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [surveyId])

  const handleExport = () => {
    if (!data) return
    try {
      exportSurveyToCSV(data)
      addToast({ type: 'success', message: 'Data survei berhasil diekspor ke CSV.' })
    } catch {
      addToast({ type: 'error', message: 'Gagal mengekspor data survei.' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Memuat hasil survei...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </Card>
    )
  }

  if (!data || data.questions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Belum Ada Respons</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Survei sudah dipublikasikan dan menunggu respons.
        </p>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {data.surveyTitle}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {data.totalResponses} respons dari target{' '}
            <span className="capitalize">{data.targetAudience}</span>
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Ekspor CSV
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {data.questions.map((q, index) => (
          <Card key={q.questionId} className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {q.questionText}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 capitalize">
                  {q.questionType === 'rating'
                    ? 'Rating 1-5'
                    : q.questionType === 'yesno'
                      ? 'Ya / Tidak'
                      : 'Teks Bebas'}
                </span>
              </div>
            </div>

            {/* Rating Chart */}
            {q.questionType === 'rating' && q.ratingDistribution && (
              <RatingChart
                avg={q.ratingAvg ?? 0}
                distribution={q.ratingDistribution}
                total={data.totalResponses}
              />
            )}

            {/* Yes/No Chart */}
            {q.questionType === 'yesno' && (
              <YesNoChart yesCount={q.yesCount ?? 0} noCount={q.noCount ?? 0} />
            )}

            {/* Text Answers */}
            {q.questionType === 'text' && q.textAnswers && q.textAnswers.length > 0 && (
              <TextAnswers answers={q.textAnswers} />
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rating Chart
// ---------------------------------------------------------------------------

function RatingChart({
  avg,
  distribution,
  total,
}: {
  avg: number
  distribution: Record<number, number>
  total: number
}) {
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']
  const data = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: distribution[star] ?? 0,
    pct: total > 0 ? ((distribution[star] ?? 0) / total) * 100 : 0,
  }))

  return (
    <div className="space-y-3">
      {/* Average */}
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={cn(
                'text-lg',
                star <= Math.round(avg) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'
              )}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {avg.toFixed(1)} / 5.0
        </span>
      </div>

      {/* Distribution bars */}
      <div className="space-y-1">
        {data.map((row) => (
          <div key={row.star} className="flex items-center gap-2 text-xs">
            <span className="w-4 text-slate-500 dark:text-slate-400 text-right">{row.star}</span>
            <span className="text-amber-400">★</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${row.pct}%`,
                  backgroundColor: COLORS[row.star - 1],
                }}
              />
            </div>
            <span className="w-8 text-right text-slate-500 dark:text-slate-400">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Yes/No Chart
// ---------------------------------------------------------------------------

function YesNoChart({ yesCount, noCount }: { yesCount: number; noCount: number }) {
  const total = yesCount + noCount
  const yesPct = total > 0 ? (yesCount / total) * 100 : 0
  const noPct = total > 0 ? (noCount / total) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Bar chart */}
      <div className="h-8 flex rounded-lg overflow-hidden">
        {yesCount > 0 && (
          <div
            className="bg-green-500 transition-all duration-500 flex items-center justify-center text-xs text-white font-medium"
            style={{ width: `${yesPct}%` }}
          >
            {yesPct > 15 && `${yesPct.toFixed(0)}%`}
          </div>
        )}
        {noCount > 0 && (
          <div
            className="bg-red-500 transition-all duration-500 flex items-center justify-center text-xs text-white font-medium"
            style={{ width: `${noPct}%` }}
          >
            {noPct > 15 && `${noPct.toFixed(0)}%`}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-700 dark:text-slate-300">
            Ya: {yesCount} ({yesPct.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-700 dark:text-slate-300">
            Tidak: {noCount} ({noPct.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Text Answers
// ---------------------------------------------------------------------------

function TextAnswers({ answers }: { answers: string[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayAnswers = showAll ? answers : answers.slice(0, 5)

  return (
    <div className="space-y-2">
      {displayAnswers.map((answer, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-300"
        >
          {answer}
        </div>
      ))}
      {answers.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {showAll ? 'Sembunyikan' : `Tampilkan semua ${answers.length} jawaban`}
        </button>
      )}
    </div>
  )
}
