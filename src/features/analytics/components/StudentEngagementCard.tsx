import { EngagementSegment } from '../types'

const SEGMENT_COLORS: Record<EngagementSegment, string> = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  at_risk: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const SEGMENT_LABELS: Record<EngagementSegment, string> = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  at_risk: 'Berisiko',
}

interface StudentEngagementCardProps {
  score?: number | null
  segment?: EngagementSegment | null
}

export function StudentEngagementCard({ score, segment }: StudentEngagementCardProps) {
  if (score === null || score === undefined || segment === null || segment === undefined) {
    return <span className="text-xs text-slate-400">–</span>
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${SEGMENT_COLORS[segment]}`}
    >
      {SEGMENT_LABELS[segment]} · {score}
    </span>
  )
}
