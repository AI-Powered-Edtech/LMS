// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import type { DashboardConfig } from '../types'
import { WidgetRenderer } from './WidgetRenderer'

interface DashboardViewerProps {
  dashboard: DashboardConfig
  courseId?: string
}

export function DashboardViewer({ dashboard, courseId }: DashboardViewerProps) {
  if (dashboard.widgets.length === 0) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 text-sm">
        Dashboard ini belum memiliki widget.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dashboard.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{dashboard.description}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboard.widgets.map((widget) => (
          <div
            key={widget.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
            style={%DOPEN% minHeight: '200px' %DCLOSE%}
          >
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {(widget.config?.label as string) ?? widget.type}
              </span>
            </div>
            <div className="p-3" style={%DOPEN% height: '200px' %DCLOSE%}>
              <WidgetRenderer widget={widget} courseId={courseId} className="h-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
