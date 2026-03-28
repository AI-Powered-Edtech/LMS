import { Edit2, Loader2, Plus, Share2, Star, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

import { cn } from '@/src/utils/cn'

import { useDashboards, useDeleteDashboard } from '../queries/dashboardQueries'
import type { DashboardConfig } from '../types'

interface DashboardListProps {
  onEdit: (dashboard: DashboardConfig) => void
  onCreate: () => void
  onView: (dashboard: DashboardConfig) => void
}

export function DashboardList({ onEdit, onCreate, onView }: DashboardListProps) {
  const { data: dashboards, isLoading } = useDashboards()
  const { mutate: deleteDashboard, isPending: isDeleting } = useDeleteDashboard()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (!confirm('Hapus dashboard ini?')) return
    setDeletingId(id)
    deleteDashboard(id, {
      onSettled: () => setDeletingId(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const list = dashboards ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daftar Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {list.length} dashboard tersimpan
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Buat Dashboard
        </button>
      </div>

      {list.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 cursor-pointer hover:border-indigo-300 transition-colors"
          onClick={onCreate}
        >
          <Plus className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <div className="text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada dashboard</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Buat dashboard kustom pertamamu
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((dashboard, i) => (
            <motion.div
              key={dashboard.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
              onClick={() => onView(dashboard)}
            >
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                {dashboard.is_default && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs font-bold text-yellow-700 dark:text-yellow-400">
                    <Star className="h-3 w-3" />
                    Default
                  </span>
                )}
                {dashboard.is_shared && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                    <Share2 className="h-3 w-3" />
                    Dibagikan
                  </span>
                )}
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {dashboard.name}
              </h3>
              {dashboard.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {dashboard.description}
                </p>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                {dashboard.widgets.length} widget
              </p>

              {/* Actions */}
              <div
                className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onEdit(dashboard)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                  )}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(dashboard.id)}
                  disabled={isDeleting && deletingId === dashboard.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                    'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50'
                  )}
                >
                  {isDeleting && deletingId === dashboard.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Hapus
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
