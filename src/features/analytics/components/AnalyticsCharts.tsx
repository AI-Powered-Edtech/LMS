// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { BookOpen } from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { useTheme } from '@/src/contexts/ThemeContext'

interface RadarDataItem {
  subject: string
  Completion: number
  fullMark: number
}

interface AnalyticsChartsProps {
  radarData: RadarDataItem[]
}

export function AnalyticsCharts({ radarData }: AnalyticsChartsProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        Penyelesaian Modul
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Tingkat penyelesaian rata-rata tiap modul dalam kursus ini.
      </p>

      {radarData.length > 0 ? (
        <div className="h-80 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
              <PolarAngleAxis
                dataKey="subject"
                tick={%DOPEN% fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 %DCLOSE%}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Completion (%)"
                dataKey="Completion"
                stroke="#4f46e5"
                fill="#4f46e5"
                fillOpacity={0.4}
              />
              <Tooltip
                contentStyle={%DOPEN%
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '0.5rem',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                %DCLOSE%}
                itemStyle={%DOPEN% fontWeight: 'bold', color: isDark ? '#f1f5f9' : '#0f172a' %DCLOSE%}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center flex-1 justify-center h-64 text-slate-400">
          <BookOpen className="w-12 h-12 mb-3 opacity-50" />
          <p>Belum ada data modul</p>
        </div>
      )}
    </div>
  )
}
