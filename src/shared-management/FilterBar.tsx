// ==========================================================================
// FilterBar — Shared search + filter bar for admin & teacher dashboards
//
// Replaces duplicated filter components:
// - AdministrationFilterBar (admin)
// - GradebookFilterBar (teacher)
// - StudentFilterBar (teacher)
//
// Features:
// - Search input with debounce
// - Configurable filter dropdowns
// - Dark mode support
// - Responsive layout
// ==========================================================================

import React, { useCallback, useRef, useState } from 'react'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
  defaultValue?: string
}

interface FilterBarProps {
  searchPlaceholder?: string
  onSearchChange: (query: string) => void
  filters?: FilterConfig[]
  onFilterChange?: (key: string, value: string) => void
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Extra actions on the right side */
  actions?: React.ReactNode
}

export function FilterBar({
  searchPlaceholder = 'Cari...',
  onSearchChange,
  filters = [],
  onFilterChange,
  debounceMs = 300,
  actions,
}: FilterBarProps) {
  const [searchValue, setSearchValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onSearchChange(value), debounceMs)
    },
    [onSearchChange, debounceMs]
  )

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter dropdowns */}
      {filters.map((filter) => (
        <select
          key={filter.key}
          defaultValue={filter.defaultValue || ''}
          onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {/* Actions */}
      {actions}
    </div>
  )
}
