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

interface RadarDataItem {
  subject: string
  Completion: number
  fullMark: number
}

interface AnalyticsChartsProps {
  radarData: RadarDataItem[]
}

export function AnalyticsCharts({ radarData }: AnalyticsChartsProps) {
  return (
    <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Penyelesaian Modul</h2>
      <p className="text-sm text-slate-500 mb-4">
        Tingkat penyelesaian rata-rata tiap modul dalam kursus ini.
      </p>

      {radarData.length > 0 ? (
        <div className="h-80 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
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
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }}
                itemStyle={{ fontWeight: 'bold' }}
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
