import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { StudentPrediction } from '../types'

interface Props {
  data: StudentPrediction[]
}

function riskFill(risk: number) {
  if (risk >= 0.7) return '#ef4444'
  if (risk >= 0.4) return '#f59e0b'
  return '#10b981'
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: StudentPrediction & { x: number; y: number } }>
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="font-semibold text-slate-800 dark:text-white mb-1">{d.student_name}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Risiko: <span className="font-medium">{(d.churn_risk * 100).toFixed(0)}%</span>
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Selesai: <span className="font-medium">{(d.completion_likelihood * 100).toFixed(0)}%</span>
      </p>
      <p className="text-slate-500 dark:text-slate-400">Tidak aktif {d.days_since_active} hari</p>
    </div>
  )
}

export function RiskRadar({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Belum ada data prediksi.
      </div>
    )
  }

  // Map to scatter-compatible format
  const points = data.map((d) => ({
    ...d,
    x: Math.round((d.avg_completion_pct ?? 0) * 10) / 10,
    y: Math.round(d.churn_risk * 100),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          type="number"
          dataKey="x"
          name="Progres"
          domain={[0, 100]}
          label={{ value: 'Progress (%)', position: 'insideBottom', offset: -10, fontSize: 11 }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Risiko"
          domain={[0, 100]}
          label={{
            value: 'Risiko Churn (%)',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            fontSize: 11,
          }}
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Scatter data={points} fill="#6366f1">
          {points.map((entry, index) => (
            <Cell key={index} fill={riskFill(entry.churn_risk)} fillOpacity={0.8} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
