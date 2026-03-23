import { forwardRef, useId } from 'react'
import { cn } from '@/src/utils/cn'
import { ChevronDown } from 'lucide-react'

/* ─── Types ───────────────────────────────────────────────────── */

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  selectSize?: 'sm' | 'md' | 'lg'
}

/* ─── Size Variants ───────────────────────────────────────────── */

const selectSizes = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-4 py-3 rounded-xl',
} as const

/* ─── Select Component ────────────────────────────────────────── */

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      selectSize = 'md',
      className,
      disabled,
      id: externalId,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const id = externalId || autoId

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'w-full appearance-none border bg-white text-slate-900 transition-colors duration-200 outline-none pr-10',
              'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'dark:bg-slate-900 dark:text-white',
              error
                ? 'border-red-400 focus:ring-red-500 focus:border-red-500 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600',
              selectSizes[selectSize],
              disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500"
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
