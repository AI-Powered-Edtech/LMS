// Quiz Analytics Panel Component
// Container that composes quiz stats overview and question difficulty chart
// Only visible for TEACHER role
import { BarChart3, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { logger } from '@/src/utils/logger'

import {
  getQuestionStats,
  type QuestionStatsWithQuestion,
  quizAnalyticsService,
  type QuizStats,
} from '../../api/quizAnalytics.service'
import { QuestionDifficultyChart } from './QuestionDifficultyChart'
import { QuizStatsOverview } from './QuizStatsOverview'

interface QuizAnalyticsPanelProps {
  quizId: string
  className?: string
}

export function QuizAnalyticsPanel({ quizId, className }: QuizAnalyticsPanelProps) {
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)
  const [questionStats, setQuestionStats] = useState<QuestionStatsWithQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [quiz, questions] = await Promise.all([
          quizAnalyticsService.getQuizStats(quizId),
          getQuestionStats(quizId),
        ])

        setQuizStats(quiz)
        setQuestionStats(questions)
      } catch (err) {
        if (import.meta.env.DEV) logger.error('Failed to load quiz analytics:', err)
        setError('Gagal memuat statistik kuis')
      } finally {
        setIsLoading(false)
      }
    }

    if (quizId) {
      fetchStats()
    }
  }, [quizId])

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Analitik Kuis</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-slate-600">Memuat statistik...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Analitik Kuis</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-slate-600" />
        <h2 className="text-lg font-bold text-slate-900">Analitik Kuis</h2>
      </div>

      <div className="space-y-6">
        {/* Overview Cards */}
        <QuizStatsOverview stats={quizStats} isLoading={false} />

        {/* Question Difficulty Chart */}
        <QuestionDifficultyChart questions={questionStats} isLoading={false} />

        {/* Empty state if no data */}
        {!quizStats && questionStats.length === 0 && (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Belum ada data analitik</p>
            <p className="text-sm text-slate-500 mt-1">
              Analitik akan tersedia setelah siswa mengerjakan kuis ini.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
