import { cn } from '@/src/utils/cn'

interface DetailField {
  label: string
  value: React.ReactNode
}

interface AdministrationDetailViewProps {
  title: string
  fields: DetailField[]
  actions?: React.ReactNode
  className?: string
}

/**
 * Detail view untuk menampilkan informasi lengkap Administrasi.
 */
export function AdministrationDetailView({
  title,
  fields,
  actions,
  className,
}: AdministrationDetailViewProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800 overflow-hidden',
        className
      )}
    >
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        {actions}
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {field.label}
            </dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">{field.value}</dd>
          </div>
        ))}
      </div>
    </div>
  )
}
