import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { EngagementTrendPoint } from '../types'

interface EngagementTrendProps {
  data: EngagementTrendPoint[]
}

export function EngagementTrend({ data }: EngagementTrendProps) {
  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-slate-400">Belum ada data tren engagement.</p>
    )

  const formatted = data.map((d) => {
    const date = new Date(d.day)
    return {
      ...d,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="engGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value) => [`${value}`, 'Skor Rata-rata']}
          contentStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="avg_score"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#engGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
