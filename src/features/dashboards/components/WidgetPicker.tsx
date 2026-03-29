// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { BarChart2, Map, PieChart, Radio, Target, TrendingUp, Trophy, X } from 'lucide-react'

import type { WidgetType } from '../types'

interface WidgetPickerProps {
  onSelect: (type: WidgetType) => void
  onClose: () => void
}

const WIDGET_OPTIONS: {
  type: WidgetType
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    type: 'metric_card',
    label: 'Metrik Angka',
    description: 'Tampilkan satu angka penting (total siswa, dll)',
    icon: <Target className="h-6 w-6" />,
  },
  {
    type: 'pie_chart',
    label: 'Diagram Lingkaran Segmen',
    description: 'Distribusi segmentasi siswa',
    icon: <PieChart className="h-6 w-6" />,
  },
  {
    type: 'engagement_trend',
    label: 'Tren Keterlibatan',
    description: 'Grafik tren keterlibatan harian',
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    type: 'risk_radar',
    label: 'Radar Risiko',
    description: 'Scatter plot risiko churn siswa',
    icon: <Radio className="h-6 w-6" />,
  },
  {
    type: 'heatmap',
    label: 'Peta Panas Retensi',
    description: 'Matriks retensi kohort mingguan',
    icon: <Map className="h-6 w-6" />,
  },
  {
    type: 'funnel',
    label: 'Analisis Corong',
    description: 'Corong konversi langkah belajar',
    icon: <BarChart2 className="h-6 w-6" />,
  },
  {
    type: 'leaderboard',
    label: 'Papan Peringkat',
    description: 'Peringkat siswa berdasarkan XP',
    icon: <Trophy className="h-6 w-6" />,
  },
]

export function WidgetPicker({ onSelect, onClose }: WidgetPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pilih Widget</h2>
          <button
            onClick={onClose}
            aria-label="Tutup pemilih widget"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
          {WIDGET_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => {
                onSelect(opt.type)
                onClose()
              }}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-center group"
            >
              <div className="text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {opt.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  {opt.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
