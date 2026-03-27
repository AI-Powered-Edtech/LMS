// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { cn } from '@/src/utils/cn'

import type { StudentPrediction } from '../types'

interface Props {
  prediction: StudentPrediction
  isExpanded?: boolean
}

const FACTOR_LABELS: Record<string, string> = {
  declining_sessions: 'Sesi menurun',
  inactive_days: 'Tidak aktif > 5 hari',
  high_struggle: 'Struggle tinggi',
  low_progress_long_enrolled: 'Progress rendah',
  low_quiz_scores: 'Skor kuis rendah',
}

function riskColor(risk: number) {
  if (risk >= 0.7) return 'text-red-600 dark:text-red-400'
  if (risk >= 0.4) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function riskBg(risk: number) {
  if (risk >= 0.7) return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/40'
  if (risk >= 0.4)
    return 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/40'
  return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/40'
}

function TrendIcon({ trend }: { trend: StudentPrediction['session_trend'] }) {
  if (trend === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  if (trend === 'rising') return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
  return <Minus className="h-3.5 w-3.5 text-slate-400" />
}

export function PredictionCard({ prediction, isExpanded = true }: Props) {
  const activeFactors = Object.entries(prediction.churn_factors)
    .filter(([, v]) => v)
    .map(([k]) => k)

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={%DOPEN% opacity: 0, height: 0 %DCLOSE%}
          animate={%DOPEN% opacity: 1, height: 'auto' %DCLOSE%}
          exit={%DOPEN% opacity: 0, height: 0 %DCLOSE%}
          transition={%DOPEN% duration: 0.2 %DCLOSE%}
          className={cn(
            'overflow-hidden rounded-lg border p-4 mt-2',
            riskBg(prediction.churn_risk)
          )}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Churn Risk */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Risiko Churn</p>
              <p className={cn('text-xl font-bold', riskColor(prediction.churn_risk))}>
                {(prediction.churn_risk * 100).toFixed(0)}%
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={cn(
                    'h-1.5 rounded-full',
                    prediction.churn_risk >= 0.7
                      ? 'bg-red-500'
                      : prediction.churn_risk >= 0.4
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  )}
                  style={%DOPEN% width: `${prediction.churn_risk * 100}%` %DCLOSE%}
                />
              </div>
            </div>

            {/* Completion Likelihood */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kemungkinan Selesai</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {(prediction.completion_likelihood * 100).toFixed(0)}%
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-1.5 rounded-full bg-indigo-500"
                  style={%DOPEN% width: `${prediction.completion_likelihood * 100}%` %DCLOSE%}
                />
              </div>
            </div>

            {/* Session Trend */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tren Sesi</p>
              <div className="flex items-center gap-1.5">
                <TrendIcon trend={prediction.session_trend} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {prediction.session_trend === 'declining'
                    ? 'Menurun'
                    : prediction.session_trend === 'rising'
                      ? 'Meningkat'
                      : 'Stabil'}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Tidak aktif {prediction.days_since_active} hari
              </p>
            </div>

            {/* Progress */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Progress</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {prediction.avg_completion_pct?.toFixed(0) ?? '—'}%
              </p>
              {prediction.avg_quiz_score != null && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Kuis: {prediction.avg_quiz_score.toFixed(0)}
                </p>
              )}
            </div>
          </div>

          {/* Risk factors */}
          {activeFactors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeFactors.map((factor) => (
                <span
                  key={factor}
                  className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
                >
                  {FACTOR_LABELS[factor] ?? factor}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
