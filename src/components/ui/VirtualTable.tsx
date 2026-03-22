import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface Column<T> {
  key: string
  header: string
  width?: string
  render: (row: T, index: number) => React.ReactNode
}

interface VirtualTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowHeight?: number
  maxHeight?: number
  getRowKey: (row: T, index: number) => string
  emptyState?: React.ReactNode
  className?: string
  'data-testid'?: string
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 52,
  maxHeight = 600,
  getRowKey,
  emptyState,
  className = '',
  'data-testid': testId,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  })

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div
      ref={parentRef}
      data-testid={testId}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800"
          style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index]
            return (
              <tr
                key={getRowKey(row, virtualRow.index)}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ width: col.width }}
                    className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    {col.render(row, virtualRow.index)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
