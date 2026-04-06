// ==========================================================================
// StatsCards — Shared statistics display for admin & teacher dashboards
//
// Replaces duplicated stat components:
// - AdministrationStats (admin)
// - GradebookStats (teacher)
// - CourseStats (teacher)
//
// Features:
// - Generic stat card with icon, value, label, trend
// - Grid layout (responsive)
// - Dark mode support
// - Skeleton loading
// ==========================================================================

import React from 'react'

export interface StatCardData {
  id: string
  label: string
  value: string | number
  icon?: string // emoji or icon class
  trend?: { direction: 'up' | 'down' | 'stable'; value: string }
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
}

interface StatsCardsProps {
  stats: StatCardData[]
  isLoading?: boolean
  columns?: 2 | 3 | 4
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  slate: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
}

const trendIcons = { up: '↑', down: '↓', stable: '→' }
const trendColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  stable: 'text-slate-500 dark:text-slate-400',
}

export function StatsCards({ stats, isLoading = false, columns = 4 }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4`}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          className={`rounded-lg border p-4 ${colorMap[stat.color || 'slate']}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium opacity-80">{stat.label}</span>
            {stat.icon && <span className="text-xl">{stat.icon}</span>}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold">{stat.value}</span>
            {stat.trend && (
              <span className={`text-sm font-medium ${trendColors[stat.trend.direction]}`}>
                {trendIcons[stat.trend.direction]} {stat.trend.value}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}