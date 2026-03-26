import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { EngagementSummaryRow } from '../types'

interface EngagementRadarProps {
  summary: EngagementSummaryRow[]
}

const SEGMENT_LABELS = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  at_risk: 'Berisiko',
} as const

export function EngagementRadar({ summary }: EngagementRadarProps) {
  if (summary.length === 0) return null

  const total = summary.reduce((s, r) => s + r.student_count, 0) || 1
  const radarData = summary.map((r) => ({
    segment: SEGMENT_LABELS[r.segment],
    pct: Math.round((r.student_count / total) * 100),
    avgScore: r.avg_score,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid />
        <PolarAngleAxis dataKey="segment" tick={{ fontSize: 11 }} />
        <Radar name="% Siswa" dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
        <Tooltip formatter={(value) => [`${value}%`, '% Siswa']} contentStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
