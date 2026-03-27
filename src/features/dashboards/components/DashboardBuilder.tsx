// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useState } from 'react'

import { cn } from '@/src/utils/cn'

import { useSaveDashboard } from '../queries/dashboardQueries'
import type { DashboardConfig, LayoutItem, WidgetConfig, WidgetType } from '../types'
import { WidgetPicker } from './WidgetPicker'
import { WidgetRenderer } from './WidgetRenderer'

interface DashboardBuilderProps {
  initialDashboard?: DashboardConfig | null
  courseId?: string
  onSaved?: (dashboard: DashboardConfig) => void
}

function generateId() {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const WIDGET_LABEL_MAP: Record<WidgetType, string> = {
  metric_card: 'Metrik',
  pie_chart: 'Diagram Lingkaran',
  engagement_trend: 'Tren',
  risk_radar: 'Radar Risiko',
  heatmap: 'Peta Panas',
  funnel: 'Corong',
  leaderboard: 'Papan Peringkat',
  line_chart: 'Grafik Garis',
  bar_chart: 'Grafik Batang',
  table: 'Tabel',
  radar: 'Radar',
}

export function DashboardBuilder({ initialDashboard, courseId, onSaved }: DashboardBuilderProps) {
  const [name, setName] = useState(initialDashboard?.name ?? 'Dashboard Baru')
  const [description, setDescription] = useState(initialDashboard?.description ?? '')
  const [isShared, setIsShared] = useState(initialDashboard?.is_shared ?? false)
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialDashboard?.widgets ?? [])
  const [showPicker, setShowPicker] = useState(false)
  const [saved, setSaved] = useState(false)

  const { mutate: saveDashboard, isPending } = useSaveDashboard()

  const handleAddWidget = useCallback((type: WidgetType) => {
    const id = generateId()
    setWidgets((prev) => [
      ...prev,
      {
        id,
        type,
        config: { label: WIDGET_LABEL_MAP[type] ?? type },
      },
    ])
  }, [])

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId))
  }, [])

  const handleSave = () => {
    // Build a simple sequential layout
    const layout: LayoutItem[] = widgets.map((w, i) => ({
      widget_id: w.id,
      x: (i % 2) * 6,
      y: Math.floor(i / 2) * 4,
      w: 6,
      h: 4,
    }))

    saveDashboard(
      {
        name,
        description,
        layout,
        widgets,
        isShared,
        dashboardId: initialDashboard?.id,
      },
      {
        onSuccess: (data) => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
          onSaved?.(data)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header / Config */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Nama Dashboard
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Deskripsi (opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="rounded"
            />
            Bagikan ke semua guru di tenant
          </label>
          <button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              saved
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? 'Tersimpan!' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Widget Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Widget ({widgets.length})
          </h3>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-400 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tambah Widget
          </button>
        </div>

        {widgets.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-slate-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-400 transition-colors"
            onClick={() => setShowPicker(true)}
          >
            <Plus className="h-10 w-10" />
            <p className="text-sm font-medium">Klik untuk menambahkan widget pertama</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map((widget) => (
              <motion.div
                key={widget.id}
                initial={%DOPEN% opacity: 0, scale: 0.95 %DCLOSE%}
                animate={%DOPEN% opacity: 1, scale: 1 %DCLOSE%}
                className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
                style={%DOPEN% minHeight: '200px' %DCLOSE%}
              >
                {/* Widget header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-600 cursor-grab" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {WIDGET_LABEL_MAP[widget.type] ?? widget.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveWidget(widget.id)}
                    aria-label="Hapus widget"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-3" style={%DOPEN% height: '160px' %DCLOSE%}>
                  <WidgetRenderer widget={widget} courseId={courseId} className="h-full" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <WidgetPicker onSelect={handleAddWidget} onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}
