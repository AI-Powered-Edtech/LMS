// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { useMemo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { EngagementSummaryRow } from '../types'
import { useTheme } from '@/src/contexts/ThemeContext'

interface EngagementRadarProps {
  summary: EngagementSummaryRow[]
}

const SEGMENT_LABELS = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  at_risk: 'Berisiko',
} as const

// ⚡ Perf: stable formatter ref
const tooltipFormatter = (value: unknown): [string, string] => [`${value}%`, '% Siswa']

export function EngagementRadar({ summary }: EngagementRadarProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  if (summary.length === 0) return null

  // ⚡ Perf: memoize reduce + map — recalculated only when summary changes
  const radarData = useMemo(() => {
    const total = summary.reduce((s, r) => s + r.student_count, 0) || 1
    return summary.map((r) => ({
      segment: SEGMENT_LABELS[r.segment],
      pct: Math.round((r.student_count / total) * 100),
      avgScore: r.avg_score,
    }))
  }, [summary])

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
        <PolarAngleAxis
          dataKey="segment"
          tick={%DOPEN% fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' %DCLOSE%}
        />
        <Radar name="% Siswa" dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={%DOPEN%
            fontSize: 12,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            color: isDark ? '#f1f5f9' : '#0f172a',
          %DCLOSE%}
          labelStyle={%DOPEN% color: isDark ? '#94a3b8' : '#64748b' %DCLOSE%}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
