import { useMemo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { useTheme } from '@/src/contexts/ThemeContext'

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

// ⚡ Perf: stable formatter ref
const tooltipFormatter = (value: unknown): [string, string] => [`${value}%`, '% Siswa']

export function EngagementRadar({ summary }: EngagementRadarProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // ⚡ Perf: consolidate multiple chained passes (.reduce then .map) into a single, standard for loop to minimize CPU overhead and O(N) operations in performance-critical code.
  const radarData = useMemo(() => {
    let total = 0
    for (let i = 0; i < summary.length; i++) {
      total += summary[i].student_count
    }
    total = total || 1

    const result = new Array(summary.length)
    for (let i = 0; i < summary.length; i++) {
      const r = summary[i]
      result[i] = {
        segment: SEGMENT_LABELS[r.segment],
        pct: Math.round((r.student_count / total) * 100),
        avgScore: r.avg_score,
      }
    }
    return result
  }, [summary])

  if (summary.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
        <PolarAngleAxis
          dataKey="segment"
          tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
        />
        <Radar name="% Siswa" dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={{
            fontSize: 12,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            color: isDark ? '#f1f5f9' : '#0f172a',
          }}
          labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
