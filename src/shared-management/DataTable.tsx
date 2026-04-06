// ==========================================================================
// DataTable — Shared data table for admin & teacher dashboards
//
// Replaces duplicated table components:
// - AdministrationTable (admin)
// - GradebookTable (teacher, similar structure)
// - CourseListTable (teacher, similar structure)
//
// Features:
// - Generic column definition
// - Built-in sorting, pagination, search
// - Dark mode support
// - Skeleton loading state
// - Role-aware action column
// ==========================================================================

import React, { useCallback, useMemo, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc'

export interface ColumnDef<T> {
  key: string
  header: string
  /** Render function for the cell */
  render: (row: T, index: number) => React.ReactNode
  /** Enable sorting for this column */
  sortable?: boolean
  /** Custom sort comparator */
  comparator?: (a: T, b: T) => number
  /** Column width (CSS value) */
  width?: string
  /** Alignment */
  align?: 'left' | 'center' | 'right'
  /** Hide on mobile */
  hideMobile?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  /** Unique key extractor */
  getRowKey: (row: T) => string
  /** Loading state shows skeleton rows */
  isLoading?: boolean
  /** Number of skeleton rows to show */
  skeletonRows?: number
  /** Items per page (default: 25) */
  pageSize?: number
  /** Empty state message */
  emptyMessage?: string
  /** Row click handler */
  onRowClick?: (row: T) => void
  /** Custom row className */
  rowClassName?: (row: T) => string
  /** Actions column (role-aware) */
  renderActions?: (row: T) => React.ReactNode
  /** Header actions (e.g., "Add" button) */
  headerActions?: React.ReactNode
  /** Table title */
  title?: string
}

// ── Component ─────────────────────────────────────────────────────────────

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  isLoading = false,
  skeletonRows = 5,
  pageSize = 25,
  emptyMessage = 'Tidak ada data',
  onRowClick,
  rowClassName,
  renderActions,
  headerActions,
  title,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(0)

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.comparator) return data
    const sorted = [...data].sort(col.comparator)
    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [data, sortKey, sortDir, columns])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  )

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('asc')
      }
      setCurrentPage(0)
    },
    [sortKey]
  )

  // Skeleton
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
    )
  }

  const allColumns = renderActions
    ? [...columns, { key: '__actions', header: 'Aksi', render: renderActions, width: '120px', align: 'center' as const }]
    : columns

  return (
    <div className="w-full">
      {(title || headerActions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>}
          {headerActions}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {allColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-${col.align || 'left'} text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                    col.hideMobile ? 'hidden md:table-cell' : ''
                  } ${col.sortable ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={allColumns.length}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={getRowKey(row)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''
                  } ${rowClassName?.(row) || ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {allColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-${col.align || 'left'} ${
                        col.hideMobile ? 'hidden md:table-cell' : ''
                      }`}
                    >
                      {col.render(row, idx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Menampilkan {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedData.length)} dari{' '}
            {sortedData.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              ←
            </button>
            <button
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}