import { useMemo } from 'react'
import { cn } from '@/src/utils/cn'
import { Skeleton } from '@/src/components/ui/Skeleton'
import { VirtualTable } from '@/src/components/ui/VirtualTable'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

interface DiscussionTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  className?: string
}

function TableSkeleton<T extends Record<string, unknown>>({
  columns,
  className,
}: Pick<DiscussionTableProps<T>, 'columns' | 'className'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden',
        className
      )}
    >
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Tabel data untuk Diskusi.
 */
export function DiscussionTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading,
  className,
}: DiscussionTableProps<T>) {
  const vtColumns = useMemo(
    () =>
      columns.map((col) => ({
        key: String(col.key),
        header: col.label,
        render: (row: T, _index: number) =>
          col.render ? col.render(row[col.key], row) : String(row[col.key] ?? ''),
      })),
    [columns]
  )

  if (isLoading) {
    return <TableSkeleton columns={columns} className={className} />
  }

  return (
    <VirtualTable<T>
      data={data}
      columns={vtColumns}
      rowHeight={72}
      maxHeight={520}
      getRowKey={(row, i) => (row as { id?: string }).id ?? String(i)}
      className={cn('rounded-2xl border border-slate-200 dark:border-slate-700', className)}
    />
  )
}
